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

describe('Flow 5: Business Rule: Delete Protection [TON-98]', () => {
  let token_instructor;
  let course_id;
  let skill_id_1;
  let unbadged_skill_id;

  beforeAll(async () => {
    // 1. Instructor setup
    const instRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Dr. DeleteProtection',
      email: 'flow5_inst@uni.ac.th',
      password: 'password123',
      role: 'instructor',
    });
    token_instructor = instRes.body.token;

    // 2. Course setup
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Web Dev Protection',
        description: 'Testing delete protection rules',
      });
    course_id = courseRes.body.course._id;

    // 3. Badged Skill setup (Express.js)
    const s1Res = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Express.js Protected',
        description: 'Building secure RESTful APIs',
        criteria: 'Pass all integration tests',
      });
    skill_id_1 = s1Res.body.skill._id;

    // 4. Student registration & badge approval
    const studRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Earned Student',
      email: 'flow5_student@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
    const token_student = studRes.body.token;
    const student_id = studRes.body.user._id || studRes.body.user.id;

    await Enrollment.create({
      student_id,
      course_id,
      status: 'active',
    });

    const publicSkills = await request(app).get(
      `/api/v1/courses/${course_id}/public-skills`
    );
    const course_skill_id_1 = publicSkills.body.skills[0].course_skill_id;

    const reqRes = await request(app)
      .post('/api/v1/verification-requests')
      .set('Authorization', `Bearer ${token_student}`)
      .send({
        course_skill_id: course_skill_id_1,
        evidence_url: 'https://github.com/student/protected-api',
      });
    const req_id = reqRes.body.verificationRequest._id;

    await request(app)
      .put(`/api/v1/verification-requests/${req_id}/approve`)
      .set('Authorization', `Bearer ${token_instructor}`);

    // 5. Add an extra unbadged skill to test unbadged deletion
    const unbadgedRes = await request(app)
      .post(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`)
      .send({
        name: 'Unbadged Skill',
        description: 'Temporary skill with no badges',
        criteria: 'Complete trial module',
      });
    unbadged_skill_id = unbadgedRes.body.skill._id;
  });

  it('Step 1: DELETE /courses/:courseId/skills/:skillId (has badge) — 400 Bad Request', async () => {
    const res = await request(app)
      .delete(`/api/v1/courses/${course_id}/skills/${skill_id_1}`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete skill with approved badges');
  });

  it('Step 2: DELETE /courses/:courseId/skills/:unbadgedSkill (no badge) — 200 OK', async () => {
    const res = await request(app)
      .delete(`/api/v1/courses/${course_id}/skills/${unbadged_skill_id}`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('successfully');
  });

  it('Step 3: GET /courses/:courseId/skills — Verify unbadged skill is removed', async () => {
    const res = await request(app)
      .get(`/api/v1/courses/${course_id}/skills`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(200);
    const skillIds = res.body.skills.map((s) => s._id);
    expect(skillIds).toContain(skill_id_1);
    expect(skillIds).not.toContain(unbadged_skill_id);
  });

  it('Step 4: DELETE /courses/:courseId (course has badges) — 400 Bad Request', async () => {
    const res = await request(app)
      .delete(`/api/v1/courses/${course_id}`)
      .set('Authorization', `Bearer ${token_instructor}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot delete course with approved badges');
  });

  it('Verify Final State: Course still exists & deleted skill not in search', async () => {
    const courseRes = await request(app).get(`/api/v1/courses/${course_id}`);
    expect(courseRes.status).toBe(200);
    expect(courseRes.body.course._id).toBe(course_id);

    const searchRes = await request(app).get('/api/v1/skills/search?q=Unbadged');
    expect(searchRes.status).toBe(200);
    const found = searchRes.body.skills.find((s) => s._id === unbadged_skill_id);
    expect(found).toBeUndefined();
  });
});
