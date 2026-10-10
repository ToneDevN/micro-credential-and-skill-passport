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

describe('Flow 6: Multi-Student Analytics Verification [TON-99]', () => {
  let f6_token_instructor;
  let f6_course_id;
  let f6_course_skill_id;
  let token_A, token_B, token_C;
  let req_A, req_B, req_C;

  beforeAll(async () => {
    // 1. Instructor setup
    const instRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. Analytics',
      email: 'flow6_inst@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    f6_token_instructor = instRes.body.token;

    // 2. Course & Skill setup
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${f6_token_instructor}`)
      .send({
        name: 'Cloud Computing',
        description: 'Cloud micro-credentials',
      });
    f6_course_id = courseRes.body.course._id;

    await request(app)
      .post(`/api/v1/courses/${f6_course_id}/skills`)
      .set('Authorization', `Bearer ${f6_token_instructor}`)
      .send({
        name: 'AWS S3 Architecture',
        description: 'Object storage',
        criteria: 'Configure bucket policies and encryption',
      });

    const publicSkills = await request(app).get(
      `/api/v1/courses/${f6_course_id}/public-skills`
    );
    f6_course_skill_id = publicSkills.body.skills[0].course_skill_id;
  });

  it('Step 1: POST /api/v1/auth/register — Register student A', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Student A',
      email: 'flow6_studentA@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    expect(res.status).toBe(201);
    token_A = res.body.token;
    await Enrollment.create({
      student_id: res.body.user._id || res.body.user.id,
      course_id: f6_course_id,
      status: 'active',
    });
  });

  it('Step 2: POST /api/v1/auth/register — Register student B', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Student B',
      email: 'flow6_studentB@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    expect(res.status).toBe(201);
    token_B = res.body.token;
    await Enrollment.create({
      student_id: res.body.user._id || res.body.user.id,
      course_id: f6_course_id,
      status: 'active',
    });
  });

  it('Step 3: POST /api/v1/auth/register — Register student C', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Student C',
      email: 'flow6_studentC@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    expect(res.status).toBe(201);
    token_C = res.body.token;
    await Enrollment.create({
      student_id: res.body.user._id || res.body.user.id,
      course_id: f6_course_id,
      status: 'active',
    });
  });

  it('Step 4: POST /api/v1/verification-requests — Student A submits request', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_A}`)
      .send({
        course_skill_id: f6_course_skill_id,
        evidence_url: 'https://github.com/studentA/aws-s3',
      });
    expect(res.status).toBe(201);
    req_A = res.body.verificationRequest._id;
  });

  it('Step 5: POST /api/v1/verification-requests — Student B submits request', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_B}`)
      .send({
        course_skill_id: f6_course_skill_id,
        evidence_url: 'https://github.com/studentB/aws-s3',
      });
    expect(res.status).toBe(201);
    req_B = res.body.verificationRequest._id;
  });

  it('Step 6: POST /api/v1/verification-requests — Student C submits request', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_C}`)
      .send({
        course_skill_id: f6_course_skill_id,
        evidence_url: 'https://github.com/studentC/aws-s3',
      });
    expect(res.status).toBe(201);
    req_C = res.body.verificationRequest._id;
  });

  it('Step 7: PUT /api/v1/verification-requests/:id/approve — Approve student A', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${req_A}/approve`)
      .set('Authorization', `Bearer ${f6_token_instructor}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
  });

  it('Step 8: PUT /api/v1/verification-requests/:id/approve — Approve student B', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${req_B}/approve`)
      .set('Authorization', `Bearer ${f6_token_instructor}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
  });

  it('Step 9: PUT /api/v1/verification-requests/:id/reject — Reject student C with feedback', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${req_C}/reject`)
      .set('Authorization', `Bearer ${f6_token_instructor}`)
      .send({
        feedback: 'S3 bucket policy is public-write. Fix security policies.',
      });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('rejected');
  });

  it('Step 10: GET /api/v1/analytics/overview — Verify totalBadgesIssued: 2, totalRejected: 1, approvalRate: 66.7', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/overview?courseId=${f6_course_id}`)
      .set('Authorization', `Bearer ${f6_token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.overview.totalBadgesIssued).toBe(2);
    expect(res.body.overview.totalRejected).toBe(1);
    // 2 / (2 + 1) * 100 = 66.666... -> 66.7
    expect(res.body.overview.approvalRate).toBe(66.7);
  });

  it('Step 11: GET /api/v1/analytics/skills — Verify skill counts (approved: 2, rejected: 1, rate: 66.7)', async () => {
    const res = await request(app)
      .get(`/api/v1/analytics/skills?courseId=${f6_course_id}`)
      .set('Authorization', `Bearer ${f6_token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.skills.length).toBe(1);
    const skillReport = res.body.skills[0];
    expect(skillReport.approved).toBe(2);
    expect(skillReport.rejected).toBe(1);
    expect(skillReport.approvalRate).toBe(66.7);
  });

  it('Verify Final State: Course skills earnedCount: 2', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${f6_course_id}/skills`)
      .set('Authorization', `Bearer ${f6_token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.skills[0].stats.earnedCount).toBe(2);
  });
});
