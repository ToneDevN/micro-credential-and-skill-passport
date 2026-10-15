const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');

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

describe('Enrollment API Routes Disabled for v1 Tests (TON-222)', () => {
  it('1. POST /api/enrollments returns 503 with coming in v2 message', async () => {
    const res = await request(app)
      .post('/api/enrollments')
      .send({ courseId: new mongoose.Types.ObjectId() });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Enrollment feature coming in v2');
  });

  it('2. DELETE /api/enrollments/:id returns 503 with coming in v2 message', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/enrollments/${fakeId}`);

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Enrollment feature coming in v2');
  });

  it('3. GET /api/enrollments/me returns 503 with coming in v2 message', async () => {
    const res = await request(app).get('/api/enrollments/me');

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Enrollment feature coming in v2');
  });

  it('4. GET /api/courses/:id/students returns 503 with coming in v2 message', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/courses/${fakeId}/students`);

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Enrollment feature coming in v2');
  });

  it('5. /api/v1/enrollments prefix also returns 503', async () => {
    const res = await request(app).get('/api/v1/enrollments');

    expect(res.status).toBe(503);
    expect(res.body.message).toBe('Enrollment feature coming in v2');
  });
});
