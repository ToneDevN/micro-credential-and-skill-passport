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
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor1, instructor2, student1, student2;
let instructor1Token, instructor2Token, student1Token;
let course1, course2;
let skill1, skill2, skill3;
let cs1, cs2, cs3;
let sss1, sss2, sss3, sss4;
let vr1, vr2, vr3, vr4;

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
  instructor1 = await User.create({
    name: 'Dr. Smith',
    email: 'smith@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  instructor2 = await User.create({
    name: 'Dr. Jones',
    email: 'jones@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student1 = await User.create({
    name: 'Alice',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  student2 = await User.create({
    name: 'Bob',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor1Token = createToken(instructor1);
  instructor2Token = createToken(instructor2);
  student1Token = createToken(student1);

  // Seed Courses
  course1 = await Course.create({
    name: 'Web Development',
    description: 'Full-stack web development',
    instructor_id: instructor1._id,
  });

  course2 = await Course.create({
    name: 'Data Science',
    description: 'Data analysis and ML',
    instructor_id: instructor2._id,
  });

  // Seed Skills
  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'REST APIs',
    criteria: 'Build API',
  });

  skill2 = await MicroSkill.create({
    name: 'React',
    description: 'Frontend',
    criteria: 'Build SPA',
  });

  skill3 = await MicroSkill.create({
    name: 'Pandas',
    description: 'Data',
    criteria: 'Clean dataset',
  });

  // CourseSkill links
  cs1 = await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  cs2 = await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });
  cs3 = await CourseSkill.create({ course_id: course2._id, skill_id: skill3._id });

  // StudentSkillStatus
  sss1 = await StudentSkillStatus.create({
    student_id: student1._id,
    course_skill_id: cs1._id,
    status: 'pending',
  });

  sss2 = await StudentSkillStatus.create({
    student_id: student1._id,
    course_skill_id: cs2._id,
    status: 'pending',
  });

  sss3 = await StudentSkillStatus.create({
    student_id: student2._id,
    course_skill_id: cs1._id,
    status: 'approved',
  });

  sss4 = await StudentSkillStatus.create({
    student_id: student2._id,
    course_skill_id: cs3._id,
    status: 'pending',
  });

  // VerificationRequests
  vr1 = await VerificationRequest.create({
    student_skill_status_id: sss1._id,
    evidence_url: 'https://github.com/alice/api',
    status: 'pending',
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  });

  vr2 = await VerificationRequest.create({
    student_skill_status_id: sss2._id,
    evidence_url: 'https://github.com/alice/spa',
    status: 'pending',
    submitted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  });

  vr3 = await VerificationRequest.create({
    student_skill_status_id: sss3._id,
    evidence_url: 'https://github.com/bob/api',
    status: 'approved',
    reviewed_by: instructor1._id,
    reviewed_at: new Date(),
    submitted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  });

  vr4 = await VerificationRequest.create({
    student_skill_status_id: sss4._id,
    evidence_url: 'https://github.com/bob/pandas',
    status: 'pending',
    submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (instructor2 course)
  });
});

describe('Verification Review API Tests (TON-88)', () => {
  describe('GET /api/verification-requests/instructor', () => {
    it('1. Instructor with 2 pending requests returns 2 pending requests with student/skill/course info', async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests).toHaveLength(2);

      const req1 = res.body.requests.find((r) => r.skill.name === 'Express.js');
      expect(req1).toBeDefined();
      expect(req1.student.name).toBe('Alice');
      expect(req1.student.email).toBe('alice@uni.ac.th');
      expect(req1.course.name).toBe('Web Development');
      expect(req1.evidence_url).toBe('https://github.com/alice/api');
      expect(req1.status).toBe('pending');
    });

    it('2. Filter by status = "approved" returns only approved requests', async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor?status=approved')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(1);
      expect(res.body.requests[0].status).toBe('approved');
      expect(res.body.requests[0].student.name).toBe('Bob');
    });

    it('3. Filter by courseId returns only requests for that course', async () => {
      const res = await request(app)
        .get(`/api/verification-requests/instructor?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(2);
      expect(res.body.requests.every((r) => r.course._id === course1._id.toString())).toBe(true);
    });

    it('4. Sort by date ascending returns oldest first', async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor?sort=date_asc')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(2);
      const date1 = new Date(res.body.requests[0].submitted_at).getTime();
      const date2 = new Date(res.body.requests[1].submitted_at).getTime();
      expect(date1).toBeLessThanOrEqual(date2);
    });

    it('5. Instructor with no requests returns empty array', async () => {
      const emptyInstructor = await User.create({
        name: 'Dr. New',
        email: 'new@uni.ac.th',
        password: 'password123',
        role: 'instructor',
      });
      const emptyToken = createToken(emptyInstructor);

      const res = await request(app)
        .get('/api/verification-requests/instructor')
        .set('Authorization', `Bearer ${emptyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it("6. Only shows requests for instructor's own courses (instructor1 doesn't see instructor2's requests)", async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const ids = res.body.requests.map((r) => r._id);
      expect(ids).not.toContain(vr4._id.toString());
    });

    it("7. Response includes filter courses list containing instructor's courses", async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.filters).toBeDefined();
      expect(res.body.filters.courses).toBeDefined();
      expect(res.body.filters.courses).toHaveLength(1);
      expect(res.body.filters.courses[0].name).toBe('Web Development');
    });

    it('8. Unauthenticated request returns 401', async () => {
      const res = await request(app).get('/api/verification-requests/instructor');

      expect(res.status).toBe(401);
    });

    it('9. Student tries to access returns 403', async () => {
      const res = await request(app)
        .get('/api/verification-requests/instructor')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/verification-requests/:id/approve', () => {
    it('10. Approve pending request returns 200, request status = "approved", badge created', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr1._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.status).toBe('approved');
      expect(res.body.badge).toBeDefined();
      expect(res.body.badge._id).toBeDefined();
    });

    it('11. Badge has correct snapshot fields (skill_name and course_name match)', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr1._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.badge.skill_name).toBe('Express.js');
      expect(res.body.badge.course_name).toBe('Web Development');
      expect(res.body.badge.issued_at).toBeDefined();
    });

    it('12. Badge pushed into StudentPassport includes new badge', async () => {
      await request(app)
        .put(`/api/verification-requests/${vr1._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      const passport = await StudentPassport.findOne({ student_id: student1._id });
      expect(passport).not.toBeNull();
      expect(passport.badges.length).toBeGreaterThanOrEqual(1);

      const added = passport.badges.find((b) => b.skill_name === 'Express.js');
      expect(added).toBeDefined();
      expect(added.course_name).toBe('Web Development');
    });

    it('13. StudentPassport auto-created if not existing (passport created + badge embedded)', async () => {
      // Ensure Alice has no passport initially
      const initialPassport = await StudentPassport.findOne({ student_id: student1._id });
      expect(initialPassport).toBeNull();

      const res = await request(app)
        .put(`/api/verification-requests/${vr1._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const createdPassport = await StudentPassport.findOne({ student_id: student1._id });
      expect(createdPassport).not.toBeNull();
      expect(createdPassport.badges).toHaveLength(1);
    });

    it('14. StudentSkillStatus updated to "approved"', async () => {
      await request(app)
        .put(`/api/verification-requests/${vr1._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      const updatedStatus = await StudentSkillStatus.findById(sss1._id);
      expect(updatedStatus.status).toBe('approved');
    });

    it('15. Request not found returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/verification-requests/${nonExistentId}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('16. Request already approved returns 400 with "Can only approve pending requests"', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr3._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Can only approve pending requests');
    });

    it('17. Request already rejected returns 400 with "Can only approve pending requests"', async () => {
      // Reject vr2 first
      vr2.status = 'rejected';
      await vr2.save();

      const res = await request(app)
        .put(`/api/verification-requests/${vr2._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Can only approve pending requests');
    });

    it("18. Instructor tries to approve another instructor's course request returns 403", async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr4._id}/approve`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });

    it('19. Unauthenticated request returns 401', async () => {
      const res = await request(app).put(`/api/verification-requests/${vr1._id}/approve`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/verification-requests/:id/reject', () => {
    it('20. Reject with valid feedback returns 200, request status = "rejected", feedback saved', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr1._id}/reject`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          feedback: 'Please include full integration test coverage in your repository.',
        });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('rejected');
      expect(res.body.request.feedback).toBe(
        'Please include full integration test coverage in your repository.'
      );

      const dbVR = await VerificationRequest.findById(vr1._id);
      expect(dbVR.status).toBe('rejected');
      expect(dbVR.feedback).toBe(
        'Please include full integration test coverage in your repository.'
      );
    });

    it('21. StudentSkillStatus updated to "rejected"', async () => {
      await request(app)
        .put(`/api/verification-requests/${vr1._id}/reject`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          feedback: 'Please include full integration test coverage in your repository.',
        });

      const updatedStatus = await StudentSkillStatus.findById(sss1._id);
      expect(updatedStatus.status).toBe('rejected');
    });

    it('22. Reject without feedback (empty) returns 400 validation error', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr1._id}/reject`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          feedback: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Feedback/i);
    });

    it('23. Reject already approved request returns 400 with "Can only reject pending requests"', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr3._id}/reject`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          feedback: 'Revoking approval is not allowed here.',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Can only reject pending requests');
    });

    it("24. Instructor tries to reject another instructor's course request returns 403", async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${vr4._id}/reject`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          feedback: 'Not my course to reject.',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });
  });
});
