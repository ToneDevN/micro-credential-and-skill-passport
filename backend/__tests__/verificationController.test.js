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
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let student1, student2, instructor;
let student1Token, student2Token, instructorToken;
let course, skill1, skill2;
let courseSkill1, courseSkill2;

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

  instructor = await User.create({
    name: 'Dr. Smith',
    email: 'smith@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student1Token = createToken(student1);
  student2Token = createToken(student2);
  instructorToken = createToken(instructor);

  // Seed Course & Skills
  course = await Course.create({
    name: 'Web Development',
    description: 'Full stack development',
    instructor_id: instructor._id,
  });

  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'REST APIs',
    criteria: 'Build an API',
  });

  skill2 = await MicroSkill.create({
    name: 'React',
    description: 'Frontend',
    criteria: 'Build a SPA',
  });

  courseSkill1 = await CourseSkill.create({
    course_id: course._id,
    skill_id: skill1._id,
  });

  courseSkill2 = await CourseSkill.create({
    course_id: course._id,
    skill_id: skill2._id,
  });

  // Seed Enrollment: student1 enrolled, student2 not enrolled
  await Enrollment.create({
    student_id: student1._id,
    course_id: course._id,
    status: 'active',
  });
});

describe('Verification Request Controller Tests (TON-75)', () => {
  describe('POST /api/verification-requests', () => {
    it('1. Submit valid request creates request with pending status and updates StudentSkillStatus', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/alice/express-api',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.evidence_url).toBe(
        'https://github.com/alice/express-api'
      );

      const status = await StudentSkillStatus.findOne({
        student_id: student1._id,
        course_skill_id: courseSkill1._id,
      });
      expect(status).toBeDefined();
      expect(status.status).toBe('pending');
    });

    it('2. Submit without evidenceUrl returns 400 validation error', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('3. Submit with invalid URL format returns 400 validation error', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('4. Submit for non-existent courseSkillId returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: nonExistentId.toString(),
          evidenceUrl: 'https://github.com/alice/project',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Course skill not found/i);
    });

    it('5. Submit when NOT enrolled in course returns 403 enrollment required', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/bob/project',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/enrolled/i);
    });

    it('6. Submit when skill already has pending request returns 400', async () => {
      await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/alice/project',
        });

      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/alice/project2',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already.*pending/i);
    });

    it('7. Submit when skill already approved returns 400', async () => {
      await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill1._id },
        { status: 'approved' },
        { upsert: true }
      );

      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/alice/project',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already.*approved/i);
    });

    it('8. Unauthenticated request returns 401', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/alice/project',
        });

      expect(res.status).toBe(401);
    });

    it('9. Instructor tries to submit returns 403 student only', async () => {
      const res = await request(app)
        .post('/api/verification-requests')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          courseSkillId: courseSkill1._id.toString(),
          evidenceUrl: 'https://github.com/instructor/project',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/verification-requests/:id', () => {
    let pendingRequest;

    beforeEach(async () => {
      const status = await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill1._id },
        { status: 'pending' },
        { upsert: true, new: true }
      );
      pendingRequest = await VerificationRequest.create({
        student_skill_status_id: status._id,
        evidence_url: 'https://github.com/alice/initial-url',
        status: 'pending',
      });
    });

    it('10. Edit pending request with new evidenceUrl returns 200 with updated URL', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          evidenceUrl: 'https://github.com/alice/updated-url',
        });

      expect(res.status).toBe(200);
      expect(res.body.request.evidence_url).toBe(
        'https://github.com/alice/updated-url'
      );
    });

    it('11. Edit non-pending request (approved) returns 400', async () => {
      pendingRequest.status = 'approved';
      await pendingRequest.save();

      const res = await request(app)
        .put(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          evidenceUrl: 'https://github.com/alice/another-url',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/pending/i);
    });

    it("12. Edit another student's request returns 403 not owner", async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          evidenceUrl: 'https://github.com/bob/hacked-url',
        });

      expect(res.status).toBe(403);
    });

    it('13. Edit non-existent request returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/verification-requests/${nonExistentId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          evidenceUrl: 'https://github.com/alice/new-url',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/verification-requests/:id', () => {
    let pendingRequest;
    let studentSkillStatus;

    beforeEach(async () => {
      studentSkillStatus = await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill1._id },
        { status: 'pending' },
        { upsert: true, new: true }
      );
      pendingRequest = await VerificationRequest.create({
        student_skill_status_id: studentSkillStatus._id,
        evidence_url: 'https://github.com/alice/initial-url',
        status: 'pending',
      });
    });

    it('14. Cancel pending request returns 200, deletes request and reverts status to not_started', async () => {
      const res = await request(app)
        .delete(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Request cancelled');

      const deletedReq = await VerificationRequest.findById(pendingRequest._id);
      expect(deletedReq).toBeNull();

      const updatedStatus = await StudentSkillStatus.findById(
        studentSkillStatus._id
      );
      expect(updatedStatus.status).toBe('not_started');
    });

    it('15. Cancel non-pending request returns 400', async () => {
      pendingRequest.status = 'approved';
      await pendingRequest.save();

      const res = await request(app)
        .delete(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/pending/i);
    });

    it("16. Cancel another student's request returns 403", async () => {
      const res = await request(app)
        .delete(`/api/verification-requests/${pendingRequest._id}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/verification-requests/:id/resubmit', () => {
    let expiredStatus;

    beforeEach(async () => {
      expiredStatus = await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill1._id },
        { status: 'expired' },
        { upsert: true, new: true }
      );
    });

    it('17. Resubmit with expired StudentSkillStatus returns 201, new request + status = pending', async () => {
      const res = await request(app)
        .post(`/api/verification-requests/${expiredStatus._id}/resubmit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          evidenceUrl: 'https://github.com/alice/renewed-evidence',
        });

      expect(res.status).toBe(201);
      expect(res.body.request).toBeDefined();
      expect(res.body.request.status).toBe('pending');
      expect(res.body.request.evidence_url).toBe(
        'https://github.com/alice/renewed-evidence'
      );

      const updatedStatus = await StudentSkillStatus.findById(expiredStatus._id);
      expect(updatedStatus.status).toBe('pending');
    });

    it('18. Resubmit with non-expired status (e.g. rejected) returns 400', async () => {
      expiredStatus.status = 'rejected';
      await expiredStatus.save();

      const res = await request(app)
        .post(`/api/verification-requests/${expiredStatus._id}/resubmit`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          evidenceUrl: 'https://github.com/alice/new-try',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it("19. Resubmit another student's skill returns 403", async () => {
      const res = await request(app)
        .post(`/api/verification-requests/${expiredStatus._id}/resubmit`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          evidenceUrl: 'https://github.com/bob/trying-to-resubmit',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/verification-requests/my', () => {
    beforeEach(async () => {
      const status1 = await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill1._id },
        { status: 'pending' },
        { upsert: true, new: true }
      );
      const status2 = await StudentSkillStatus.findOneAndUpdate(
        { student_id: student1._id, course_skill_id: courseSkill2._id },
        { status: 'approved' },
        { upsert: true, new: true }
      );

      await VerificationRequest.create({
        student_skill_status_id: status1._id,
        evidence_url: 'https://github.com/alice/req1',
        status: 'pending',
      });

      await VerificationRequest.create({
        student_skill_status_id: status2._id,
        evidence_url: 'https://github.com/alice/req2',
        status: 'approved',
        feedback: 'Great job!',
        reviewed_by: instructor._id,
      });
    });

    it('20. Get own requests (has 2 requests) returns 200 with skill and course names', async () => {
      const res = await request(app)
        .get('/api/verification-requests/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
      expect(res.body.requests).toHaveLength(2);

      const skillNames = res.body.requests.map((r) => r.skillName);
      expect(skillNames).toContain('Express.js');
      expect(skillNames).toContain('React');

      const courseNames = res.body.requests.map((r) => r.courseName);
      expect(courseNames).toContain('Web Development');
    });

    it('21. Get own requests (has 0) returns empty array', async () => {
      const res = await request(app)
        .get('/api/verification-requests/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toEqual([]);
    });

    it('22. Filter by status ?status=pending returns only pending requests', async () => {
      const res = await request(app)
        .get('/api/verification-requests/my?status=pending')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(1);
      expect(res.body.requests[0].status).toBe('pending');
    });

    it("23. Student2 cannot see Student1's requests", async () => {
      const res = await request(app)
        .get('/api/verification-requests/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toEqual([]);
    });
  });
});
