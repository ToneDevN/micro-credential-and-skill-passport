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

describe('Flow 4: Edit and Cancel Pending Request [TON-97]', () => {
  let f4_token_student;
  let f4_token_instructor;
  let f4_course_id;
  let f4_skill_id;
  let f4_course_skill_id;
  let f4_request_id;

  beforeAll(async () => {
    // Setup independent instructor, course, and unbadged skill
    const instRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. CancelFlow',
      email: 'flow4_inst@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    f4_token_instructor = instRes.body.token;

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${f4_token_instructor}`)
      .send({
        name: 'DevOps Flow4',
        description: 'CI/CD pipeline testing',
      });
    f4_course_id = courseRes.body.course._id;

    const skillRes = await request(app)
      .post(`/api/v1/courses/${f4_course_id}/skills`)
      .set('Authorization', `Bearer ${f4_token_instructor}`)
      .send({
        name: 'Git Actions',
        description: 'GitHub workflows',
        criteria: 'Configure lint and test pipeline',
      });
    f4_skill_id = skillRes.body.skill._id;

    const studRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Student',
      email: 'flow4_bob@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    f4_token_student = studRes.body.token;

    const publicSkills = await request(app).get(
      `/api/v1/courses/${f4_course_id}/public-skills`
    );
    f4_course_skill_id = publicSkills.body.skills[0].course_skill_id;

    await Enrollment.create({
      student_id: studRes.body.user._id || studRes.body.user.id,
      course_id: f4_course_id,
      status: 'active',
    });
  });

  it('Step 1: POST /api/v1/verification-requests — Submit initial request with wrong URL', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${f4_token_student}`)
      .send({
        course_skill_id: f4_course_skill_id,
        evidence_url: 'https://github.com/wrong/repo',
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequest.status).toBe('pending');
    expect(res.body.verificationRequest.evidence_url).toBe('https://github.com/wrong/repo');

    f4_request_id = res.body.verificationRequest._id;
  });

  it('Step 2: PUT /api/v1/verification-requests/:id — Update pending request evidence URL', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${f4_request_id}`)
      .set('Authorization', `Bearer ${f4_token_student}`)
      .send({
        evidence_url: 'https://github.com/correct/repo',
      });

    expect(res.status).toBe(200);
    expect(res.body.request.evidence_url).toBe('https://github.com/correct/repo');
  });

  it('Step 3: GET /api/v1/verification-requests/my — Verify updated URL', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/my')
      .set('Authorization', `Bearer ${f4_token_student}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === f4_request_id);
    expect(found).toBeDefined();
    expect(found.evidence_url).toBe('https://github.com/correct/repo');
    expect(found.status).toBe('pending');
  });

  it('Step 4: DELETE /api/v1/verification-requests/:id — Cancel pending request', async () => {
    const res = await request(app)
      .delete(`/api/v1/verification-requests/${f4_request_id}`)
      .set('Authorization', `Bearer ${f4_token_student}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('cancelled');
  });

  it('Step 5: GET /api/v1/verification-requests/my — Verify request is cancelled/removed', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/my')
      .set('Authorization', `Bearer ${f4_token_student}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === f4_request_id);
    expect(found).toBeUndefined();
  });

  it('Step 6: GET /api/v1/verification-requests/instructor — Request removed from instructor queue', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/instructor')
      .set('Authorization', `Bearer ${f4_token_instructor}`);

    expect(res.status).toBe(200);
    const found = res.body.requests.find((r) => r._id === f4_request_id);
    expect(found).toBeUndefined();
  });

  it('Verify Final State: Student can re-submit for same skill without duplicate error', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${f4_token_student}`)
      .send({
        course_skill_id: f4_course_skill_id,
        evidence_url: 'https://github.com/re-submitted/correct-repo',
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequest.status).toBe('pending');
  });
});
