const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');
const { Enrollment } = require('../../src/models');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Flow 3: Reject and Re-submit Cycle [TON-96]', () => {
  let token_instructor;
  let course_id;
  let skill_id_1;
  let skill_id_2;
  let course_skill_id_1;
  let course_skill_id_2;

  let token_student;
  let student_id;
  let request_id_2;

  beforeAll(async () => {
    // 1. Instructor setup
    const instRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. RejectFlow',
      email: 'flow3_instructor@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    token_instructor = instRes.body.token;

    // 2. Course & Skills setup
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Web Dev',
        description: 'Full Stack Web Development with Express & MongoDB',
      });
    course_id = courseRes.body.course._id;

    const s1Res = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Express.js',
        description: 'Building RESTful APIs with Node.js and Express',
        criteria: 'Implement secure REST endpoints and authentication middleware',
      });
    skill_id_1 = s1Res.body.skill._id;

    const s2Res = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'MongoDB',
        description: 'NoSQL Database Schema Design & Mongoose',
        criteria: 'Design schemas, indexes, and complex aggregation pipelines',
      });
    skill_id_2 = s2Res.body.skill._id;

    // 3. Student setup & enrollment
    const studRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Student',
      email: 'flow3_alice@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    token_student = studRes.body.token;
    student_id = studRes.body.user._id || studRes.body.user.id;

    await Enrollment.create({
      student_id,
      course_id,
      status: 'active',
    });

    const pSkills = await request(app).get(
      `/api/v1/courses/${course_id}/public-skills`
    );
    const s1 = pSkills.body.skills.find((s) => s._id === skill_id_1);
    const s2 = pSkills.body.skills.find((s) => s._id === skill_id_2);
    course_skill_id_1 = s1.course_skill_id;
    course_skill_id_2 = s2.course_skill_id;

    // 4. Initial prerequisite: Alice already earned badge 1 (Express.js)
    const req1Res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_student}`)
      .send({
        course_skill_id: course_skill_id_1,
        evidence_url: 'https://github.com/alice/express-api-final',
      });
    const req1_id = req1Res.body.verificationRequest._id;

    await request(app)
      .put(`/api/v1/verification-requests/${req1_id}/approve`)
      .set('Authorization', `Bearer ${token_instructor}`);
  });

  it('Step 1: POST /api/v1/verification-requests — Submit evidence for skill 2', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_student}`)
      .send({
        course_skill_id: course_skill_id_2,
        evidence_url: 'https://github.com/alice/mongo-v1',
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequest.status).toBe('pending');
    request_id_2 = res.body.verificationRequest._id;
  });

  it('Step 2: GET /api/v1/verification-requests/instructor — Instructor sees request 2', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/instructor')
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === request_id_2);
    expect(found).toBeDefined();
  });

  it('Step 3: PUT /api/v1/verification-requests/:id/reject — Instructor rejects with feedback', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${request_id_2}/reject`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        feedback: 'Please add error handling and mongoose validations',
      });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
    expect(res.body.request.feedback).toContain('Please add error handling');
  });

  it('Step 4: GET /api/v1/verification-requests/my — Student sees rejected status & feedback', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/my')
      .set('Authorization', `Bearer ${token_student}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === request_id_2);
    expect(found).toBeDefined();
    expect(found.status).toBe('rejected');
    expect(found.feedback).toContain('Please add error handling');
  });

  it('Step 5: POST /api/v1/verification-requests/:id/resubmit — Student resubmits with new evidence', async () => {
    const res = await request(app)
      .post(`/api/v1/verification-requests/${request_id_2}/resubmit`)
      .set('Authorization', `Bearer ${token_student}`)
      .send({
        evidence_url: 'https://github.com/alice/mongo-v2-improved',
      });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('pending');
    expect(res.body.request.evidence_url).toBe('https://github.com/alice/mongo-v2-improved');
  });

  it('Step 6: GET /api/v1/verification-requests/instructor?status=pending — Instructor sees pending request again', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/instructor?status=pending')
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === request_id_2);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
  });

  it('Step 7: PUT /api/v1/verification-requests/:id/approve — Instructor approves resubmission', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${request_id_2}/approve`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.badge.skill_name).toBe('MongoDB');
  });

  it('Step 8: GET /api/v1/passport — Student verifies second badge in passport', async () => {
    const res = await request(app)
      .get('/api/v1/passport')
      .set('Authorization', `Bearer ${token_student}`);

    expect(res.status).toBe(200);
    expect(res.body.passport.badges.length).toBe(2);
    const names = res.body.passport.badges.map((b) => b.skill_name);
    expect(names).toContain('Express.js');
    expect(names).toContain('MongoDB');
  });

  it('Verify Final State: 2 approved requests & totalBadges: 2', async () => {
    const requestsRes = await request(app)
      .get('/api/v1/verification-requests/my')
      .set('Authorization', `Bearer ${token_student}`);

    expect(requestsRes.status).toBe(200);
    expect(requestsRes.body.requests.length).toBe(2);
    expect(requestsRes.body.requests.every((r) => r.status === 'approved')).toBe(true);

    const passportRes = await request(app)
      .get('/api/v1/passport')
      .set('Authorization', `Bearer ${token_student}`);

    expect(passportRes.body.passport.totalBadges).toBe(2);
  });
});
