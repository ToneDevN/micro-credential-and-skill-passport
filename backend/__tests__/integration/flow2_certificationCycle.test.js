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

describe('Flow 2: Full Certification Cycle (Happy Path) [TON-95]', () => {
  let token_instructor;
  let course_id;
  let skill_id_1;
  let skill_id_2;
  let course_skill_id_1;
  let course_skill_id_2;

  let token_student;
  let student_id;
  let request_id_1;

  beforeAll(async () => {
    // Setup instructor, course, and skills
    const instRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. Setup',
      email: 'flow2_instructor@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    token_instructor = instRes.body.token;

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
  });

  it('Step 1: POST /api/v1/auth/register — Register student', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Student',
      email: 'flow2_alice@uni.ac.th',
      password: 'password123',
      role: 'student',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();

    token_student = res.body.token;
    student_id = res.body.user._id || res.body.user.id;

    await Enrollment.create({
      student_id,
      course_id,
      status: 'active',
    });
  });

  it('Step 2: POST /api/v1/auth/login — Re-login student to refresh token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'flow2_alice@uni.ac.th',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    token_student = res.body.token;
  });

  it('Step 3: GET /api/v1/courses — Student views catalog course from Flow 1', async () => {
    const res = await request(app)
      .get('/api/v1/courses')
      .set('Authorization', `Bearer ${token_student}`);

    expect(res.status).toBe(200);
    expect(res.body.courses.some((c) => c._id === course_id)).toBe(true);
  });

  it('Step 4: GET /api/v1/courses/:courseId/public-skills — Retrieve course_skill_id', async () => {
    const res = await request(app).get(`/api/v1/courses/${course_id}/public-skills`);

    expect(res.status).toBe(200);
    const skill1 = res.body.skills.find((s) => s._id === skill_id_1);
    expect(skill1).toBeDefined();
    expect(skill1.course_skill_id).toBeDefined();

    course_skill_id_1 = skill1.course_skill_id;

    const skill2 = res.body.skills.find((s) => s._id === skill_id_2);
    expect(skill2).toBeDefined();
    course_skill_id_2 = skill2.course_skill_id;
  });

  it('Step 5: POST /api/v1/verification-requests — Student submits evidence', async () => {
    const res = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_student}`)
      .send({
        course_skill_id: course_skill_id_1,
        evidence_url: 'https://github.com/alice/express-api-final',
      });

    expect(res.status).toBe(201);
    expect(res.body.verificationRequest).toBeDefined();
    expect(res.body.verificationRequest.status).toBe('pending');

    request_id_1 = res.body.verificationRequest._id;
  });

  it('Step 6: GET /api/v1/verification-requests/my — Student verifies pending request', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/my')
      .set('Authorization', `Bearer ${token_student}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    const reqItem = res.body.requests.find((r) => r._id === request_id_1);
    expect(reqItem).toBeDefined();
    expect(reqItem.status).toBe('pending');
  });

  it('Step 7: GET /api/v1/verification-requests/instructor — Instructor sees request in queue', async () => {
    const res = await request(app)
      .get('/api/v1/verification-requests/instructor')
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.requests).toBeInstanceOf(Array);
    const found = res.body.requests.find((r) => r._id === request_id_1);
    expect(found).toBeDefined();
    expect(found.student.name).toBe('Alice Student');
  });

  it('Step 8: PUT /api/v1/verification-requests/:id/approve — Instructor approves request', async () => {
    const res = await request(app)
      .put(`/api/v1/verification-requests/${request_id_1}/approve`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('approved');
    expect(res.body.badge).toBeDefined();
    expect(res.body.badge.skill_name).toBe('Express.js');
    expect(res.body.badge.course_name).toBe('Web Dev');
  });

  it('Step 9: GET /api/v1/passport — Student verifies badge in passport', async () => {
    const res = await request(app)
      .get('/api/v1/passport')
      .set('Authorization', `Bearer ${token_student}`);

    expect(res.status).toBe(200);
    expect(res.body.passport).toBeDefined();
    expect(res.body.passport.badges).toBeInstanceOf(Array);
    expect(res.body.passport.badges.length).toBe(1);
    expect(res.body.passport.badges[0].skill_name).toBe('Express.js');
    expect(res.body.passport.badges[0].course_name).toBe('Web Dev');
  });

  it('Step 10: GET /api/v1/passport/:studentId — Public views verified passport', async () => {
    const res = await request(app).get(`/api/v1/passport/${student_id}`);

    expect(res.status).toBe(200);
    expect(res.body.passport).toBeDefined();
    expect(res.body.passport.badges.length).toBe(1);
    expect(res.body.passport.badges[0].skill_name).toBe('Express.js');
  });

  it('Verify Final State: Stats & Analytics updated', async () => {
    const courseStats = await request(app)
      .get(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(courseStats.status).toBe(200);
    const skill1Stats = courseStats.body.skills.find((s) => s._id === skill_id_1);
    expect(skill1Stats.stats.earnedCount).toBe(1);

    const analytics = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(analytics.status).toBe(200);
    expect(analytics.body.overview.totalBadgesIssued).toBe(1);
    expect(analytics.body.overview.approvalRate).toBe(100);
  });
});
