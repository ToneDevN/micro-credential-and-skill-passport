const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const {
  User,
  Course,
  MicroSkill,
  CourseSkill,
  Enrollment,
  StudentSkillStatus,
  VerificationRequest,
} = require('../src/models');

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

const createToken = (user) => {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Re-submit Verification Request API Unit Tests (TON-155, TON-141)', () => {
  let student1, student2, instructor;
  let token1, token2;
  let course, skill1, skill2, courseSkill1, courseSkill2;
  let sss1, sss2;
  let rejectedReq;

  beforeEach(async () => {
    // 1. Create Users
    instructor = await User.create({
      name: 'Dr. Tech Instructor',
      email: 'instructor@example.com',
      password: 'password123',
      role: 'instructor',
    });

    student1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password123',
      role: 'student',
    });

    student2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'password123',
      role: 'student',
    });

    token1 = createToken(student1);
    token2 = createToken(student2);

    // 2. Setup Course & Skills
    course = await Course.create({
      name: 'Modern Web Development',
      description: 'Fullstack Course',
      instructor_id: instructor._id,
    });

    skill1 = await MicroSkill.create({
      name: 'Node.js Express API',
      description: 'REST API design',
      criteria: 'Pass all tests and security guidelines',
      is_open_for_verification: true,
    });

    skill2 = await MicroSkill.create({
      name: 'React Frontend',
      description: 'Component architecture',
      criteria: 'Build responsive UI components',
      is_open_for_verification: true,
    });

    courseSkill1 = await CourseSkill.create({
      course_id: course._id,
      skill_id: skill1._id,
      order: 1,
    });

    courseSkill2 = await CourseSkill.create({
      course_id: course._id,
      skill_id: skill2._id,
      order: 2,
    });

    // 3. Enroll students
    await Enrollment.create({
      student_id: student1._id,
      course_id: course._id,
      status: 'active',
    });

    await Enrollment.create({
      student_id: student2._id,
      course_id: course._id,
      status: 'active',
    });

    // 4. Update StudentSkillStatus for skill 1 to rejected (auto-created by Enrollment hook)
    sss1 = await StudentSkillStatus.findOneAndUpdate(
      { student_id: student1._id, course_skill_id: courseSkill1._id },
      { status: 'rejected' },
      { new: true, upsert: true }
    );

    // 5. Create a rejected VerificationRequest for student 1
    rejectedReq = await VerificationRequest.create({
      student_skill_status_id: sss1._id,
      evidence_url: 'https://github.com/alice/initial-attempt',
      status: 'rejected',
      feedback: 'Evidence does not handle errors and edge cases properly. Please revise and resubmit.',
      reviewed_by: instructor._id,
      reviewed_at: new Date(),
    });
  });

  // #1 Resubmit a rejected request with a new evidence URL
  it('#1: should return 201, create a new document with status: pending and new evidence_url', async () => {
    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'https://github.com/alice/revised-improved-attempt',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request).toBeDefined();
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.evidence_url).toBe('https://github.com/alice/revised-improved-attempt');
    expect(res.body.request._id.toString()).not.toBe(rejectedReq._id.toString());

    // StudentSkillStatus should now be pending
    const updatedSSS = await StudentSkillStatus.findById(sss1._id);
    expect(updatedSSS.status).toBe('pending');
  });

  // #2 Original rejected request is untouched after resubmit
  it('#2: should leave original rejected request untouched in history with status: rejected and original feedback', async () => {
    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'https://github.com/alice/revised-attempt-v2',
      });

    expect(res.status).toBe(201);

    // Verify original rejected document in DB
    const originalDoc = await VerificationRequest.findById(rejectedReq._id);
    expect(originalDoc).toBeDefined();
    expect(originalDoc.status).toBe('rejected');
    expect(originalDoc.evidence_url).toBe('https://github.com/alice/initial-attempt');
    expect(originalDoc.feedback).toBe(
      'Evidence does not handle errors and edge cases properly. Please revise and resubmit.'
    );
    expect(originalDoc.reviewed_by.toString()).toBe(instructor._id.toString());
  });

  // #3 Resubmit a request that is still pending
  it('#3: should return 400 when attempting to resubmit a pending request', async () => {
    const pendingReq = await VerificationRequest.create({
      student_skill_status_id: sss1._id,
      evidence_url: 'https://github.com/alice/pending-submission',
      status: 'pending',
    });

    const res = await request(app)
      .post(`/api/verification-requests/${pendingReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'https://github.com/alice/another-url',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only rejected/i);
  });

  // #4 Resubmit a request that is already approved
  it('#4: should return 400 when attempting to resubmit an approved request', async () => {
    const approvedReq = await VerificationRequest.create({
      student_skill_status_id: sss1._id,
      evidence_url: 'https://github.com/alice/approved-submission',
      status: 'approved',
    });

    const res = await request(app)
      .post(`/api/verification-requests/${approvedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'https://github.com/alice/another-url',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only rejected/i);
  });

  // #5 Resubmit while a different pending request exists for the same skill
  it('#5: should return 400 with "คุณมีคำขอที่รออยู่สำหรับ skill นี้แล้ว" when a pending request already exists for the same skill', async () => {
    // Create an active pending request for sss1
    await VerificationRequest.create({
      student_skill_status_id: sss1._id,
      evidence_url: 'https://github.com/alice/concurrent-pending',
      status: 'pending',
    });

    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'https://github.com/alice/attempting-resubmit-while-pending',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('คุณมีคำขอที่รออยู่สำหรับ skill นี้แล้ว');
  });

  // #6 Resubmit someone else's rejected request
  it("#6: should return 403 when a student tries to resubmit another student's request", async () => {
    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token2}`)
      .send({
        evidence_url: 'https://github.com/bob/hacker-attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
  });

  // #7 Resubmit with an invalid evidence URL format
  it('#7: should return 400 validation error when evidence URL is invalid', async () => {
    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        evidence_url: 'not-a-valid-url',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/url/i);
  });

  // #8 Unauthenticated request
  it('#8: should return 401 when request is not authenticated', async () => {
    const res = await request(app)
      .post(`/api/verification-requests/${rejectedReq._id}/resubmit`)
      .send({
        evidence_url: 'https://github.com/alice/unauth-attempt',
      });

    expect(res.status).toBe(401);
  });
});
