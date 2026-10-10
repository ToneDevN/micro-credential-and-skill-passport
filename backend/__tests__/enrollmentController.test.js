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
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor, student1, student2;
let instructorToken, student1Token, student2Token;
let course1, course2;
let skill1, skill2, skill3;
let cs1, cs2, cs3;

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

  // Seed Users
  instructor = await User.create({
    name: 'Dr. John Instructor',
    email: 'instructor@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student1 = await User.create({
    name: 'Alice Student',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  student2 = await User.create({
    name: 'Bob Student',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructorToken = createToken(instructor);
  student1Token = createToken(student1);
  student2Token = createToken(student2);

  // Seed Courses
  course1 = await Course.create({
    name: 'Web Development',
    description: 'Full stack web development bootcamp',
    instructor_id: instructor._id,
  });

  course2 = await Course.create({
    name: 'Database Engineering',
    description: 'Relational and NoSQL databases',
    instructor_id: instructor._id,
  });

  // Seed Skills
  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'REST API framework',
    criteria: 'Build a REST API',
  });

  skill2 = await MicroSkill.create({
    name: 'React.js',
    description: 'Frontend library',
    criteria: 'Build a React SPA',
  });

  skill3 = await MicroSkill.create({
    name: 'MongoDB',
    description: 'Document database',
    criteria: 'Design schemas and aggregations',
  });

  // Course 1 has 2 skills: skill1, skill2
  cs1 = await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  cs2 = await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });

  // Course 2 has 1 skill: skill3
  cs3 = await CourseSkill.create({ course_id: course2._id, skill_id: skill3._id });
});

describe('Course Enrollment API Tests (TON-117)', () => {
  // ==========================================
  // POST /api/courses/:courseId/enroll (Cases 1 - 5)
  // ==========================================
  describe('POST /api/courses/:courseId/enroll', () => {
    it('1. Student enrolls in a course not yet enrolled -> 201, enrollment status active', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.enrollment).toBeDefined();
      expect(res.body.enrollment.status).toBe('active');
      expect(res.body.enrollment.course_id.toString()).toBe(course1._id.toString());
      expect(res.body.enrollment.student_id.toString()).toBe(student1._id.toString());

      const dbEnrollment = await Enrollment.findOne({
        student_id: student1._id,
        course_id: course1._id,
      });
      expect(dbEnrollment).not.toBeNull();
      expect(dbEnrollment.status).toBe('active');
    });

    it('2. Student enrolls in the same course twice -> 409 Conflict', async () => {
      // First enrollment
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Second enrollment attempt
      const res = await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already enrolled/i);
    });

    it('3. Enroll in a non-existent course -> 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/courses/${nonExistentId}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/course not found/i);
    });

    it('4. Instructor attempts to enroll -> 403', async () => {
      const res = await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
    });

    it('5. Unauthenticated request -> 401', async () => {
      const res = await request(app).post(`/api/courses/${course1._id}/enroll`);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // PUT /api/courses/:courseId/unenroll (Cases 6 - 8, UC-33, TON-127)
  // ==========================================
  describe('PUT /api/courses/:courseId/unenroll (and DELETE alias)', () => {
    it('6. Unenroll with no pending requests -> 200, enrollment status set to dropped (soft-delete)', async () => {
      // Enroll first
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      const res = await request(app)
        .put(`/api/courses/${course1._id}/unenroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ถอนการลงทะเบียนสำเร็จ/i);
      expect(res.body.enrollment.status).toBe('dropped');

      const dbEnrollment = await Enrollment.findOne({
        student_id: student1._id,
        course_id: course1._id,
      });
      expect(dbEnrollment).not.toBeNull();
      expect(dbEnrollment.status).toBe('dropped');
    });

    it('7. Unenroll with a pending verification request -> 400 with Thai error message', async () => {
      // Enroll first
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      const sss = await StudentSkillStatus.findOne({
        student_id: student1._id,
        course_skill_id: cs1._id,
      });

      // Student has a pending request
      await VerificationRequest.create({
        student_skill_status_id: sss._id,
        evidence_url: 'https://github.com/alice/pending-test',
        status: 'pending',
      });

      const res = await request(app)
        .put(`/api/courses/${course1._id}/unenroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        'ไม่สามารถถอนได้ เนื่องจากมีคำขอรับรองทักษะที่รออยู่ กรุณายกเลิกคำขอก่อน'
      );

      // Enrollment should remain active
      const dbEnrollment = await Enrollment.findOne({
        student_id: student1._id,
        course_id: course1._id,
      });
      expect(dbEnrollment.status).toBe('active');
    });

    it('7b. Unenroll with approved badge but NO pending request succeeds (badges do not block)', async () => {
      // Enroll first
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Student has approved status/badge in course1
      await StudentSkillStatus.updateOne(
        { student_id: student1._id, course_skill_id: cs1._id },
        { status: 'approved' },
        { upsert: true }
      );

      const res = await request(app)
        .put(`/api/courses/${course1._id}/unenroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.enrollment.status).toBe('dropped');
    });

    it('8. Unenroll from a course never enrolled in -> 404', async () => {
      const res = await request(app)
        .put(`/api/courses/${course1._id}/unenroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/enrollment not found/i);
    });
  });

  // ==========================================
  // GET /api/students/me/enrollments (Cases 9 - 12)
  // ==========================================
  describe('GET /api/students/me/enrollments', () => {
    it('9. Student with 2 enrolled courses, mixed progress -> 200, correct earnedCount/totalCount per course', async () => {
      // Enroll in both courses
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);
      await request(app)
        .post(`/api/courses/${course2._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Student earned 1 skill in course1 (cs1 approved)
      await StudentSkillStatus.updateOne(
        { student_id: student1._id, course_skill_id: cs1._id },
        { status: 'approved' }
      );

      const res = await request(app)
        .get('/api/students/me/enrollments')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.enrollments).toHaveLength(2);

      const c1Enrollment = res.body.enrollments.find(
        (e) => e.course._id.toString() === course1._id.toString()
      );
      const c2Enrollment = res.body.enrollments.find(
        (e) => e.course._id.toString() === course2._id.toString()
      );

      expect(c1Enrollment).toBeDefined();
      expect(c1Enrollment.earnedCount).toBe(1);
      expect(c1Enrollment.totalCount).toBe(2);

      expect(c2Enrollment).toBeDefined();
      expect(c2Enrollment.earnedCount).toBe(0);
      expect(c2Enrollment.totalCount).toBe(1);
    });

    it('10. Student with no enrollments -> 200, empty array', async () => {
      const res = await request(app)
        .get('/api/students/me/enrollments')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.enrollments).toBeDefined();
      expect(res.body.enrollments).toEqual([]);
    });

    it('11. earnedCount/totalCount only reflects skills in the enrolled course -> Does not leak other courses skills', async () => {
      // Student1 enrolls in course1 only
      await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);

      // Student1 earns a badge for course2 skill (cs3)
      await StudentSkillStatus.create({
        student_id: student1._id,
        course_skill_id: cs3._id,
        status: 'approved',
      });

      const res = await request(app)
        .get('/api/students/me/enrollments')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.enrollments).toHaveLength(1);

      const c1Enrollment = res.body.enrollments[0];
      // course1 has 2 skills, student earned 0 in course1
      expect(c1Enrollment.earnedCount).toBe(0);
      expect(c1Enrollment.totalCount).toBe(2);
    });

    it('12. Unauthenticated request -> 401', async () => {
      const res = await request(app).get('/api/students/me/enrollments');

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // PUT /api/enrollments/:id/complete (Cases 13 - 16)
  // ==========================================
  describe('PUT /api/enrollments/:id/complete', () => {
    it('13. Instructor manually marks enrollment complete -> 200, status "completed", completed_at set', async () => {
      // Student enrolls
      const enrollRes = await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);
      const enrollmentId = enrollRes.body.enrollment._id;

      const res = await request(app)
        .put(`/api/enrollments/${enrollmentId}/complete`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.enrollment.status).toBe('completed');
      expect(res.body.enrollment.completed_at).toBeDefined();

      const dbEnrollment = await Enrollment.findById(enrollmentId);
      expect(dbEnrollment.status).toBe('completed');
      expect(dbEnrollment.completed_at).not.toBeNull();
    });

    it('14. Auto-complete triggers when last skill in course is approved -> Enrollment status flips to "completed"', async () => {
      // Student enrolls in course2 (course2 has 1 skill: cs3)
      const enrollRes = await request(app)
        .post(`/api/courses/${course2._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);
      const enrollmentId = enrollRes.body.enrollment._id;

      // Find student skill status for cs3
      const sss = await StudentSkillStatus.findOne({
        student_id: student1._id,
        course_skill_id: cs3._id,
      });

      // Student submits verification request
      const vr = await VerificationRequest.create({
        student_skill_status_id: sss._id,
        evidence_url: 'https://github.com/alice/mongodb-demo',
        status: 'pending',
      });

      // Instructor approves verification request
      const approveRes = await request(app)
        .put(`/api/verification-requests/${vr._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(approveRes.status).toBe(200);

      // Verify Enrollment was auto-completed
      const dbEnrollment = await Enrollment.findById(enrollmentId);
      expect(dbEnrollment.status).toBe('completed');
      expect(dbEnrollment.completed_at).not.toBeNull();
    });

    it('15. Student attempts manual complete -> 403', async () => {
      const enrollRes = await request(app)
        .post(`/api/courses/${course1._id}/enroll`)
        .set('Authorization', `Bearer ${student1Token}`);
      const enrollmentId = enrollRes.body.enrollment._id;

      const res = await request(app)
        .put(`/api/enrollments/${enrollmentId}/complete`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });

    it('16. Complete a non-existent enrollment -> 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/enrollments/${nonExistentId}/complete`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/enrollment not found/i);
    });
  });
});
