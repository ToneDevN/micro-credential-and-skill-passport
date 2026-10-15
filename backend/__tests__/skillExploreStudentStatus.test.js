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
  Badge,
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor, student;
let instructorToken, studentToken;
let course;
let skillApproved, skillPending, skillRejected, skillNotStarted;
let csApproved, csPending, csRejected, csNotStarted;

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

  // 1. Create Users
  instructor = await User.create({
    name: 'Prof. John',
    email: 'john@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student = await User.create({
    name: 'Alice Student',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructorToken = createToken(instructor);
  studentToken = createToken(student);

  // 2. Create Course
  course = await Course.create({
    name: 'Web Engineering',
    description: 'Modern Web Engineering course',
    instructor_id: instructor._id,
  });

  // 3. Create Skills
  skillApproved = await MicroSkill.create({
    name: 'Skill A Approved',
    description: 'Approved mastery description',
    criteria: 'Build fully tested API',
  });

  skillPending = await MicroSkill.create({
    name: 'Skill B Pending',
    description: 'Pending review description',
    criteria: 'Implement auth system',
  });

  skillRejected = await MicroSkill.create({
    name: 'Skill C Rejected',
    description: 'Rejected submission description',
    criteria: 'Write unit tests',
  });

  skillNotStarted = await MicroSkill.create({
    name: 'Skill D Not Started',
    description: 'Untouched skill description',
    criteria: 'Setup CI/CD pipeline',
  });

  // 4. Link CourseSkills
  csApproved = await CourseSkill.create({
    course_id: course._id,
    skill_id: skillApproved._id,
  });

  csPending = await CourseSkill.create({
    course_id: course._id,
    skill_id: skillPending._id,
  });

  csRejected = await CourseSkill.create({
    course_id: course._id,
    skill_id: skillRejected._id,
  });

  csNotStarted = await CourseSkill.create({
    course_id: course._id,
    skill_id: skillNotStarted._id,
  });

  // 5. Seed Statuses & Requests
  // Approved: Badge exists + StudentSkillStatus approved
  const sssApproved = await StudentSkillStatus.create({
    student_id: student._id,
    course_skill_id: csApproved._id,
    status: 'approved',
  });

  await Badge.create({
    student_id: student._id,
    skill_id: skillApproved._id,
    course_skill_id: csApproved._id,
    course_id: course._id,
    issued_at: new Date(),
  });

  // Pending: StudentSkillStatus pending + VerificationRequest pending
  const sssPending = await StudentSkillStatus.create({
    student_id: student._id,
    course_skill_id: csPending._id,
    status: 'pending',
  });

  await VerificationRequest.create({
    student_skill_status_id: sssPending._id,
    evidence_url: 'https://github.com/alice/auth-demo',
    status: 'pending',
  });

  // Rejected: StudentSkillStatus rejected + VerificationRequest rejected
  const sssRejected = await StudentSkillStatus.create({
    student_id: student._id,
    course_skill_id: csRejected._id,
    status: 'rejected',
  });

  await VerificationRequest.create({
    student_skill_status_id: sssRejected._id,
    evidence_url: 'https://github.com/alice/tests-demo',
    status: 'rejected',
    feedback: 'Missing integration tests coverage',
  });
});

describe('TON-165: Explore Skills studentStatus API Tests', () => {
  describe('GET /api/courses/:courseId/public-skills', () => {
    it('1. Unauthenticated request omits studentStatus on all skills', async () => {
      const res = await request(app).get(`/api/courses/${course._id}/public-skills`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(4);
      res.body.skills.forEach((s) => {
        expect(s.studentStatus).toBeUndefined();
      });
    });

    it('2. Instructor request omits studentStatus on all skills', async () => {
      const res = await request(app)
        .get(`/api/courses/${course._id}/public-skills`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(4);
      res.body.skills.forEach((s) => {
        expect(s.studentStatus).toBeUndefined();
      });
    });

    it('3. Authenticated student receives accurate studentStatus for each skill', async () => {
      const res = await request(app)
        .get(`/api/courses/${course._id}/public-skills`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(4);

      const statusById = {};
      res.body.skills.forEach((s) => {
        statusById[s._id.toString()] = s.studentStatus;
      });

      expect(statusById[skillApproved._id.toString()]).toBe('approved');
      expect(statusById[skillPending._id.toString()]).toBe('pending');
      expect(statusById[skillRejected._id.toString()]).toBe('rejected');
      expect(statusById[skillNotStarted._id.toString()]).toBe('not_started');
    });
  });

  describe('GET /api/skills (paginated explore)', () => {
    it('4. Unauthenticated request omits studentStatus', async () => {
      const res = await request(app).get('/api/skills');

      expect(res.status).toBe(200);
      expect(res.body.skills.length).toBeGreaterThanOrEqual(4);
      res.body.skills.forEach((s) => {
        expect(s.studentStatus).toBeUndefined();
      });
    });

    it('5. Authenticated student receives studentStatus on paginated skills', async () => {
      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const statusById = {};
      res.body.skills.forEach((s) => {
        statusById[s._id.toString()] = s.studentStatus;
      });

      expect(statusById[skillApproved._id.toString()]).toBe('approved');
      expect(statusById[skillPending._id.toString()]).toBe('pending');
      expect(statusById[skillRejected._id.toString()]).toBe('rejected');
      expect(statusById[skillNotStarted._id.toString()]).toBe('not_started');
    });
  });

  describe('GET /api/skills/search', () => {
    it('6. Authenticated student searching skills receives studentStatus', async () => {
      const res = await request(app)
        .get('/api/skills/search?q=Skill')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.skills.length).toBe(4);

      const statusById = {};
      res.body.skills.forEach((s) => {
        statusById[s._id.toString()] = s.studentStatus;
      });

      expect(statusById[skillApproved._id.toString()]).toBe('approved');
      expect(statusById[skillPending._id.toString()]).toBe('pending');
      expect(statusById[skillRejected._id.toString()]).toBe('rejected');
      expect(statusById[skillNotStarted._id.toString()]).toBe('not_started');
    });

    it('7. Unauthenticated search omits studentStatus', async () => {
      const res = await request(app).get('/api/skills/search?q=Skill');

      expect(res.status).toBe(200);
      expect(res.body.skills.length).toBe(4);
      res.body.skills.forEach((s) => {
        expect(s.studentStatus).toBeUndefined();
      });
    });
  });
});
