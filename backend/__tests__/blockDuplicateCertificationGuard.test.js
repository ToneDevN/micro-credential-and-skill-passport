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
  StudentSkillStatus,
  VerificationRequest,
  Enrollment,
  Badge,
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor, student;
let instructorToken, studentToken;
let course, skill1, skill2;
let cs1, cs2;
let enrollment;

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '1d',
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

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Create Instructor & Student
  instructor = await User.create({
    name: 'Dr. John',
    email: 'john@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });
  instructorToken = createToken(instructor);

  student = await User.create({
    name: 'Somchai Student',
    email: 'somchai@uni.ac.th',
    password: 'password123',
    role: 'student',
  });
  studentToken = createToken(student);

  // Create Course & Skills
  course = await Course.create({
    name: 'Full Stack Engineering',
    description: 'Learn modern web architecture',
    instructor_id: instructor._id,
  });

  skill1 = await MicroSkill.create({
    name: 'Docker & Containers',
    description: 'Containerization principles',
    criteria: 'Build Dockerfile and compose file',
    is_open_for_verification: true,
  });

  skill2 = await MicroSkill.create({
    name: 'Kubernetes Cluster',
    description: 'Orchestration and pods',
    criteria: 'Deploy manifests to cluster',
    is_open_for_verification: true,
  });

  cs1 = await CourseSkill.create({ course_id: course._id, skill_id: skill1._id });
  cs2 = await CourseSkill.create({ course_id: course._id, skill_id: skill2._id });

  // Enroll Student in Course
  enrollment = await Enrollment.create({
    student_id: student._id,
    course_id: course._id,
    status: 'active',
  });
});

describe('TON-167: Block Duplicate Certification Guard (UC-06 Business Rule)', () => {
  it('1. Submit request for skill with no existing badge -> 201 Created', async () => {
    const res = await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        skill_id: skill1._id.toString(),
        evidence_url: 'https://github.com/somchai/docker-lab',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request).toBeDefined();
    expect(res.body.request.status).toBe('pending');
  });

  it('2. Submit request for skill that already has BADGE -> 409 SKILL_ALREADY_CERTIFIED', async () => {
    // Student already earned a badge for skill1
    await Badge.create({
      student_id: student._id,
      skill_id: skill1._id,
      skill_name: 'Docker & Containers',
      course_name: 'Full Stack Engineering',
      issued_at: new Date(),
    });

    // Also test with StudentPassport badge
    await StudentPassport.create({
      student_id: student._id,
      badges: [
        {
          skill_id: skill1._id,
          skill_name: 'Docker & Containers',
          course_name: 'Full Stack Engineering',
          issued_at: new Date(),
        },
      ],
    });

    const res = await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        skill_id: skill1._id.toString(),
        evidence_url: 'https://github.com/somchai/docker-lab-again',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SKILL_ALREADY_CERTIFIED');
    expect(res.body.message).toBe('ทักษะนี้ได้รับการรับรองแล้ว ไม่สามารถยื่นคำขอซ้ำได้');
  });

  it('2b. Submit request using courseSkillId for skill that already has BADGE -> 409 SKILL_ALREADY_CERTIFIED', async () => {
    await Badge.create({
      student_id: student._id,
      skill_id: skill1._id,
      skill_name: 'Docker & Containers',
      course_name: 'Full Stack Engineering',
    });

    const res = await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseSkillId: cs1._id.toString(),
        evidenceUrl: 'https://github.com/somchai/docker-lab-again',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SKILL_ALREADY_CERTIFIED');
    expect(res.body.message).toBe('ทักษะนี้ได้รับการรับรองแล้ว ไม่สามารถยื่นคำขอซ้ำได้');
  });

  it('3. Submit request for skill with rejected request (no badge) -> 201 Created (re-submit allowed)', async () => {
    const sss = await StudentSkillStatus.findOne({
      student_id: student._id,
      course_skill_id: cs1._id,
    });
    sss.status = 'rejected';
    await sss.save();

    await VerificationRequest.create({
      student_skill_status_id: sss._id,
      evidence_url: 'https://github.com/somchai/old-repo',
      status: 'rejected',
      feedback: 'Please fix Dockerfile multi-stage build',
      submitted_at: new Date(Date.now() - 86400000),
    });

    const res = await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        skill_id: skill1._id.toString(),
        evidence_url: 'https://github.com/somchai/fixed-repo',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.evidence_url).toBe('https://github.com/somchai/fixed-repo');
  });

  it('4. Submit request for skill with pending request -> 409 existing pending error', async () => {
    // Create an initial request
    await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        skill_id: skill1._id.toString(),
        evidence_url: 'https://github.com/somchai/first-submit',
      });

    // Try to submit another request for the same skill while previous is pending
    const res = await request(app)
      .post('/api/verification-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        skill_id: skill1._id.toString(),
        evidence_url: 'https://github.com/somchai/second-submit',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('คุณมีคำขอที่รออยู่สำหรับ skill นี้แล้ว');
    expect(res.body.code).toBe('PENDING_REQUEST_EXISTS');
  });
});
