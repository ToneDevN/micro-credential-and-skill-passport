const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../../server');

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

describe('Flow 1: Instructor Setup (Course + Skills) [TON-94]', () => {
  let token_instructor;
  let instructor_id;
  let course_id;
  let skill_id_1;
  let skill_id_2;

  it('Step 1: POST /api/v1/auth/register — Register instructor', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. Setup',
      email: 'flow1_instructor@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('instructor');

    token_instructor = res.body.token;
    instructor_id = res.body.user._id || res.body.user.id;
  });

  it('Step 2: POST /api/v1/courses — Create course', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Web Dev',
        description: 'Full Stack Web Development with Express & MongoDB',
      });

    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.name).toBe('Web Dev');

    course_id = res.body.course._id;
  });

  it('Step 3: GET /api/v1/courses/:id — Verify course details match Step 2', async () => {
    const res = await request(app).get(`/api/v1/courses/${course_id}`);

    expect(res.status).toBe(200);
    expect(res.body.course).toBeDefined();
    expect(res.body.course._id).toBe(course_id);
    expect(res.body.course.name).toBe('Web Dev');
    expect(res.body.course.description).toContain('Full Stack Web Development');
  });

  it('Step 4: POST /api/v1/courses/:courseId/skills — Add skill 1 (Express.js)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Express.js',
        description: 'Building RESTful APIs with Node.js and Express',
        criteria: 'Implement secure REST endpoints and authentication middleware',
      });

    expect(res.status).toBe(201);
    expect(res.body.skill).toBeDefined();
    expect(res.body.skill.name).toBe('Express.js');

    skill_id_1 = res.body.skill._id;
  });

  it('Step 5: POST /api/v1/courses/:courseId/skills — Add skill 2 (MongoDB)', async () => {
    const res = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'MongoDB',
        description: 'NoSQL Database Schema Design & Mongoose',
        criteria: 'Design schemas, indexes, and complex aggregation pipelines',
      });

    expect(res.status).toBe(201);
    expect(res.body.skill).toBeDefined();
    expect(res.body.skill.name).toBe('MongoDB');

    skill_id_2 = res.body.skill._id;
  });

  it('Step 6: GET /api/v1/courses/:courseId/skills — Instructor lists skills with stats', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.skills).toBeInstanceOf(Array);
    expect(res.body.skills.length).toBe(2);
    expect(res.body.skills[0].stats).toBeDefined();
    expect(res.body.skills[0].stats.earnedCount).toBe(0);
  });

  it('Step 7: GET /api/v1/courses/:courseId/public-skills — Public view of course skills', async () => {
    const res = await request(app).get(`/api/v1/courses/${course_id}/public-skills`);

    expect(res.status).toBe(200);
    expect(res.body.skills).toBeInstanceOf(Array);
    expect(res.body.skills.length).toBe(2);
  });

  it('Step 8: GET /api/v1/skills/search?q=Express — Search skill by keyword', async () => {
    const res = await request(app).get('/api/v1/skills/search?q=Express');

    expect(res.status).toBe(200);
    expect(res.body.skills).toBeInstanceOf(Array);
    const found = res.body.skills.find((s) => s.name === 'Express.js');
    expect(found).toBeDefined();
    expect(found.courses).toBeInstanceOf(Array);
    expect(found.courses.some((c) => c.name === 'Web Dev')).toBe(true);
  });

  it('Verify Final State: GET /api/v1/courses — Course has skillCount: 2', async () => {
    const res = await request(app).get('/api/v1/courses');

    expect(res.status).toBe(200);
    const c = res.body.courses.find((course) => course._id === course_id);
    expect(c).toBeDefined();
    expect(c.skillCount).toBe(2);
  });
});
