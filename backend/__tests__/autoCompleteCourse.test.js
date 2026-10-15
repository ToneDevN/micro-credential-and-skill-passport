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
  Notification,
  StudentPassport,
} = require('../src/models');
const enrollmentService = require('../src/services/enrollmentService');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor, student, unenrolledStudent;
let instructorToken, studentToken;
let course;
let skill1, skill2;
let cs1, cs2;
let sss1, sss2;
let vr1, vr2;
let activeEnrollment;

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

  // 1. Create Instructor
  instructor = await User.create({
    name: 'Prof. Xavier',
    email: 'xavier@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });
  instructorToken = createToken(instructor);

  // 2. Create Students
  student = await User.create({
    name: 'Peter Parker',
    email: 'peter@uni.ac.th',
    password: 'password123',
    role: 'student',
  });
  studentToken = createToken(student);

  unenrolledStudent = await User.create({
    name: 'Miles Morales',
    email: 'miles@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  // 3. Create Course with 2 Micro-Skills
  course = await Course.create({
    name: 'Advanced Web Development',
    description: 'Master full-stack systems',
    instructor_id: instructor._id,
  });

  skill1 = await MicroSkill.create({
    name: 'Node.js Backend',
    description: 'REST API architecture',
    criteria: 'Build robust Node.js API',
  });

  skill2 = await MicroSkill.create({
    name: 'React Frontend',
    description: 'Modern SPA development',
    criteria: 'Build responsive UI',
  });

  cs1 = await CourseSkill.create({
    course_id: course._id,
    skill_id: skill1._id,
  });

  cs2 = await CourseSkill.create({
    course_id: course._id,
    skill_id: skill2._id,
  });

  // 4. Enroll Student in Course (active)
  activeEnrollment = await Enrollment.create({
    student_id: student._id,
    course_id: course._id,
    status: 'active',
    enrolled_at: new Date(),
  });

  // 5. Update StudentSkillStatus (created by Enrollment hook) to pending
  sss1 = await StudentSkillStatus.findOne({
    student_id: student._id,
    course_skill_id: cs1._id,
  });
  sss1.status = 'pending';
  await sss1.save();

  sss2 = await StudentSkillStatus.findOne({
    student_id: student._id,
    course_skill_id: cs2._id,
  });
  sss2.status = 'pending';
  await sss2.save();

  vr1 = await VerificationRequest.create({
    student_skill_status_id: sss1._id,
    evidence_url: 'https://github.com/peter/node-api',
    status: 'pending',
    submitted_at: new Date(),
  });

  vr2 = await VerificationRequest.create({
    student_skill_status_id: sss2._id,
    evidence_url: 'https://github.com/peter/react-spa',
    status: 'pending',
    submitted_at: new Date(),
  });
});

describe('UC-50 / TON-144 / TON-159: Auto-complete Course on All Skills Certified', () => {
  it('1. Approving a skill when more remain uncertified does not complete the enrollment', async () => {
    // Approve skill 1 (1 of 2 skills)
    const res = await request(app)
      .put(`/api/verification-requests/${vr1._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');

    // Enrollment remains active
    const enrollment = await Enrollment.findById(activeEnrollment._id);
    expect(enrollment.status).toBe('active');
    expect(enrollment.completed_at).toBeNull();

    // No course_completed notification should exist
    const completedNotif = await Notification.findOne({
      user_id: student._id,
      type: 'course_completed',
    });
    expect(completedNotif).toBeNull();
  });

  it('2. Approving the last un-certified skill in an enrolled course flips Enrollment to completed and sets completed_at', async () => {
    // Pre-approve skill 1
    sss1.status = 'approved';
    await sss1.save();
    vr1.status = 'approved';
    vr1.reviewed_by = instructor._id;
    vr1.reviewed_at = new Date();
    await vr1.save();

    // Now approve skill 2 (the last uncertified skill)
    const res = await request(app)
      .put(`/api/verification-requests/${vr2._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.badge).toBeDefined();

    // Enrollment status flips to 'completed' with completed_at set
    const updatedEnrollment = await Enrollment.findById(activeEnrollment._id);
    expect(updatedEnrollment.status).toBe('completed');
    expect(updatedEnrollment.completed_at).toBeInstanceOf(Date);
  });

  it('3. Approving a skill for a student not enrolled in that course is a silent no-op (no error, no enrollment changes)', async () => {
    // Setup verification request for unenrolled student
    const unenrolledStatus = await StudentSkillStatus.create({
      student_id: unenrolledStudent._id,
      course_skill_id: cs1._id,
      status: 'pending',
    });

    const unenrolledVR = await VerificationRequest.create({
      student_skill_status_id: unenrolledStatus._id,
      evidence_url: 'https://github.com/miles/api',
      status: 'pending',
      submitted_at: new Date(),
    });

    const res = await request(app)
      .put(`/api/verification-requests/${unenrolledVR._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.badge).toBeDefined();

    // No enrollment created or completed
    const anyEnrollment = await Enrollment.findOne({
      student_id: unenrolledStudent._id,
      course_id: course._id,
    });
    expect(anyEnrollment).toBeNull();

    // No course_completed notification created
    const notif = await Notification.findOne({
      user_id: unenrolledStudent._id,
      type: 'course_completed',
    });
    expect(notif).toBeNull();
  });

  it('4. Creates course_completed notification with correct course name in message', async () => {
    // Pre-approve skill 1
    sss1.status = 'approved';
    await sss1.save();

    // Approve the final skill (skill 2)
    const res = await request(app)
      .put(`/api/verification-requests/${vr2._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);

    // Verify course_completed notification exists with expected message
    const completedNotif = await Notification.findOne({
      user_id: student._id,
      type: 'course_completed',
    });

    expect(completedNotif).not.toBeNull();
    expect(completedNotif.type).toBe('course_completed');
    expect(completedNotif.message).toBe(
      `ยินดีด้วย! คุณผ่านวิชา ${course.name} ครบทุกทักษะแล้ว`
    );
    expect(completedNotif.related_id.toString()).toBe(course._id.toString());
  });

  it('5. Enrollment already completed is idempotent and does not create duplicate notifications', async () => {
    // Set enrollment as already completed
    activeEnrollment.status = 'completed';
    activeEnrollment.completed_at = new Date();
    await activeEnrollment.save();

    // Existing completed notification
    await Notification.create({
      user_id: student._id,
      type: 'course_completed',
      message: `ยินดีด้วย! คุณผ่านวิชา ${course.name} ครบทุกทักษะแล้ว`,
      related_id: course._id,
    });

    // Both skills are approved
    sss1.status = 'approved';
    await sss1.save();

    // Call service directly or approve another request in this course
    const result = await enrollmentService.checkAndCompleteCourse(
      student._id,
      course._id
    );

    expect(result.completed).toBe(false);

    // Count course_completed notifications remains exactly 1
    const notifCount = await Notification.countDocuments({
      user_id: student._id,
      type: 'course_completed',
    });
    expect(notifCount).toBe(1);
  });

  it('6. Helper throwing internally does not block or fail the approve endpoint (returns 200 with badge)', async () => {
    // Spy on checkAndCompleteCourse and mock it to throw an unexpected error
    const spy = jest
      .spyOn(enrollmentService, 'checkAndCompleteCourse')
      .mockImplementationOnce(() => {
        throw new Error('Database connection spike failure');
      });

    const res = await request(app)
      .put(`/api/verification-requests/${vr1._id}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`);

    // Endpoint still succeeds with 200 and issues the badge
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.badge).toBeDefined();
    expect(res.body.badge.skill_name).toBe('Node.js Backend');

    spy.mockRestore();
  });
});
