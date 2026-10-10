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

describe('Flow 8: Token Lifecycle [TON-101]', () => {
  let f8_token;

  beforeAll(async () => {
    // Create user for token lifecycle test
    await request(app).post('/api/v1/auth/register').send({
      name: 'Lifecycle User',
      email: 'flow8_user@uni.ac.th',
      password: 'password123',
      role: 'student',
    });
  });

  it('Step 1: GET /api/v1/auth/me without token — 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('Step 2: POST /api/v1/auth/login — 200 OK and receives token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'flow8_user@uni.ac.th',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    f8_token = res.body.token;
  });

  it('Step 3: GET /api/v1/auth/me with token from Step 2 — 200 OK', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${f8_token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('flow8_user@uni.ac.th');
  });

  it('Step 4: POST /api/v1/auth/logout with token — 200 OK', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${f8_token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Logged out');
  });

  it('Step 5: GET /api/v1/auth/me with invalidated token — 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${f8_token}`);

    expect(res.status).toBe(401);
  });

  it('Step 6: GET /api/v1/courses without token — 200 OK (Public access still works)', async () => {
    const res = await request(app).get('/api/v1/courses');
    expect(res.status).toBe(200);
  });
});
