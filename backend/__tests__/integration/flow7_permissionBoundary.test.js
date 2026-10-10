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

describe('Flow 7: Permission Boundary Test [TON-100]', () => {
  let f7_token_student;
  let f7_token_instructor_owner;
  let f7_token_instructor_other;
  let f7_course_id;
  let f7_request_id;

  beforeAll(async () => {
    // 1. Student
    const sRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Perm Student',
      email: 'flow7_perm_student@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    f7_token_student = sRes.body.token;

    // 2. Instructor Owner
    const i1Res = await request(app).post('/api/v1/auth/register').send({
      name: 'Owner Instructor',
      email: 'flow7_owner_inst@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    f7_token_instructor_owner = i1Res.body.token;

    // 3. Instructor Other
    const i2Res = await request(app).post('/api/v1/auth/register').send({
      name: 'Other Instructor',
      email: 'flow7_other_inst@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    f7_token_instructor_other = i2Res.body.token;

    // Setup course & skill owned by Instructor 1
    const cRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${f7_token_instructor_owner}`)
      .send({
        name: 'Security 101',
        description: 'Cybersecurity basics',
      });
    f7_course_id = cRes.body.course._id;

    await request(app)
      .post(`/api/v1/courses/${f7_course_id}/skills`)
      .set('Authorization', `Bearer ${f7_token_instructor_owner}`)
      .send({
        name: 'OWASP Top 10',
        description: 'Security vulnerabilities',
        criteria: 'Identify and fix top 10 vulnerabilities',
      });

    const pSkills = await request(app).get(
      `/api/v1/courses/${f7_course_id}/public-skills`
    );
    const courseSkillId = pSkills.body.skills[0].course_skill_id;

    await Enrollment.create({
      student_id: sRes.body.user._id || sRes.body.user.id,
      course_id: f7_course_id,
      status: 'active',
    });

    // Submit verification request by student
    const reqRes = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${f7_token_student}`)
      .send({
        course_skill_id: courseSkillId,
        evidence_url: 'https://github.com/perm/owasp-fix',
      });
    f7_request_id = reqRes.body.verificationRequest._id;
  });

  it('Step 1: POST /api/v1/courses with token_student — 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${f7_token_student}`)
      .send({
        name: 'Illegal Course',
        description: 'Should fail',
      });
    expect(res.status).toBe(403);
  });

  it('Step 2: GET /api/v1/verification-requests/instructor with token_student — 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/instructor')
      .set('Authorization', `Bearer ${f7_token_student}`);
    expect(res.status).toBe(403);
  });

  it('Step 3: PUT /api/v1/verification-requests/:id/approve with token_student — 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${f7_request_id}/approve`)
      .set('Authorization', `Bearer ${f7_token_student}`);
    expect(res.status).toBe(403);
  });

  it('Step 4: PUT /api/v1/verification-requests/:id/reject with token_student — 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${f7_request_id}/reject`)
      .set('Authorization', `Bearer ${f7_token_student}`)
      .send({ feedback: 'Illegal rejection feedback' });
    expect(res.status).toBe(403);
  });

  it('Step 5: GET /api/v1/analytics/overview with token_student — 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${f7_token_student}`);
    expect(res.status).toBe(403);
  });

  it('Step 6: POST /api/v1/verification-requests with token_instructor — 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${f7_token_instructor_owner}`)
      .send({
        course_skill_id: new mongoose.Types.ObjectId(),
        evidence_url: 'https://github.com/inst/illegal-submission',
      });
    expect(res.status).toBe(403);
  });

  it('Step 7: GET /api/v1/passport with token_instructor — 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/passport')
      .set('Authorization', `Bearer ${f7_token_instructor_owner}`);
    expect(res.status).toBe(403);
  });

  it('Step 8: GET /api/v1/courses/:courseId/skills with token_instructor_other — 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${f7_course_id}/skills`)
      .set('Authorization', `Bearer ${f7_token_instructor_other}`);
    expect(res.status).toBe(403);
  });

  it('Step 9: PUT /api/v1/courses/:courseId with token_instructor_other — 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/v1/courses/${f7_course_id}`)
      .set('Authorization', `Bearer ${f7_token_instructor_other}`)
      .send({ name: 'Hacked Name' });
    expect(res.status).toBe(403);
  });

  it('Step 10: PUT /api/v1/verification-requests/:id/approve with token_instructor_other — 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${f7_request_id}/approve`)
      .set('Authorization', `Bearer ${f7_token_instructor_other}`);
    expect(res.status).toBe(403);
  });
});
