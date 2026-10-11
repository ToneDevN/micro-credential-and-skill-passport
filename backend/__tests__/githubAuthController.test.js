const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { User } = require('../src/models');
const encryption = require('../src/utils/encryption');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let student, instructor;
let studentToken, instructorToken;

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

  // Seed student and instructor
  student = await User.create({
    name: 'Alice Student',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor = await User.create({
    name: 'Bob Instructor',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  studentToken = createToken(student);
  instructorToken = createToken(instructor);

  // Restore fetch mocks if spied
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
});

afterEach(() => {
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
  jest.restoreAllMocks();
});

describe('GitHub OAuth Connect/Disconnect Unit Tests (TON-133)', () => {
  test('#1: Authenticated student hits /auth/github/connect - 302 redirect with scope=repo and state param', async () => {
    const res = await request(app)
      .get('/api/auth/github/connect')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain('github.com/login/oauth/authorize');
    expect(res.headers.location).toContain('scope=repo');
    expect(res.headers.location).toContain('state=');
  });

  test('#2: Unauthenticated request to /auth/github/connect - 401', async () => {
    const res = await request(app).get('/api/auth/github/connect');
    expect(res.status).toBe(401);
  });

  test('#3: Callback with valid code exchanges token successfully - updates User and redirects to /settings?github=connected', async () => {
    const state = jwt.sign({ userId: student._id.toString() }, JWT_SECRET, {
      expiresIn: '15m',
    });

    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'https://github.com/login/oauth/access_token') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: 'gho_mock_secret_token_12345' }),
        });
      }
      if (url === 'https://api.github.com/user') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ login: 'octocat' }),
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    const res = await request(app)
      .get(`/api/auth/github/callback?code=mock_code&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/settings?github=connected');

    const updatedUser = await User.findById(student._id);
    expect(updatedUser.github_username).toBe('octocat');
    expect(updatedUser.github_connected_status).toBe('connected');
    expect(updatedUser.github_access_token).toBeDefined();
  });

  test('#4: Callback with invalid/expired state - redirects to /settings?github=error, no User update', async () => {
    const invalidState = 'invalid.jwt.token';

    const res = await request(app)
      .get(`/api/auth/github/callback?code=mock_code&state=${invalidState}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/settings?github=error');

    const user = await User.findById(student._id);
    expect(user.github_connected_status).toBe('not_connected');
    expect(user.github_username).toBeNull();
  });

  test('#5: Callback where GitHub token exchange fails - redirects to /settings?github=error', async () => {
    const state = jwt.sign({ userId: student._id.toString() }, JWT_SECRET, {
      expiresIn: '15m',
    });

    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'https://github.com/login/oauth/access_token') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ error: 'bad_verification_code' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const res = await request(app)
      .get(`/api/auth/github/callback?code=bad_code&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/settings?github=error');

    const user = await User.findById(student._id);
    expect(user.github_connected_status).toBe('not_connected');
  });

  test('#6: Student denies authorization (error=access_denied) - redirects to /settings?github=error, no User update', async () => {
    const state = jwt.sign({ userId: student._id.toString() }, JWT_SECRET, {
      expiresIn: '15m',
    });

    const res = await request(app)
      .get(`/api/auth/github/callback?error=access_denied&error_description=User+denied&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/settings?github=error');

    const user = await User.findById(student._id);
    expect(user.github_connected_status).toBe('not_connected');
    expect(user.github_username).toBeNull();
  });

  test('#7: Access token is stored encrypted, not plaintext - raw DB value does not equal plaintext token', async () => {
    const rawPlaintextToken = 'gho_super_secret_plaintext_token_999';
    const state = jwt.sign({ userId: student._id.toString() }, JWT_SECRET, {
      expiresIn: '15m',
    });

    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'https://github.com/login/oauth/access_token') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: rawPlaintextToken }),
        });
      }
      if (url === 'https://api.github.com/user') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ login: 'octocat' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const res = await request(app)
      .get(`/api/auth/github/callback?code=mock_code&state=${state}`);

    expect(res.status).toBe(302);

    const updatedUser = await User.findById(student._id);
    expect(updatedUser.github_access_token).not.toBe(rawPlaintextToken);
    expect(updatedUser.github_access_token).toContain(':'); // IV:ciphertext format

    // Verify it decrypts back to original token
    const decrypted = encryption.decrypt(updatedUser.github_access_token);
    expect(decrypted).toBe(rawPlaintextToken);
  });

  test('#8: Student disconnects GitHub - username and access_token become null, status not_connected', async () => {
    // Set student as connected first
    student.github_username = 'octocat';
    student.github_access_token = encryption.encrypt('gho_sample_token');
    student.github_connected_status = 'connected';
    await student.save();

    const res = await request(app)
      .delete('/api/users/me/github')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('GitHub disconnected');

    const updated = await User.findById(student._id);
    expect(updated.github_username).toBeNull();
    expect(updated.github_access_token).toBeNull();
    expect(updated.github_connected_status).toBe('not_connected');
  });

  test('#9: Disconnect when not connected - 200, idempotent, no error', async () => {
    expect(student.github_connected_status).toBe('not_connected');

    const res = await request(app)
      .delete('/api/users/me/github')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('GitHub disconnected');

    const updated = await User.findById(student._id);
    expect(updated.github_connected_status).toBe('not_connected');
  });

  test('#10: Unauthenticated disconnect request - 401', async () => {
    const res = await request(app).delete('/api/users/me/github');
    expect(res.status).toBe(401);
  });

  test('#11: Instructor connects GitHub (allowed per spec) - 302 redirect succeeds same as student', async () => {
    const res = await request(app)
      .get('/api/auth/github/connect')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('github.com/login/oauth/authorize');
    expect(res.headers.location).toContain('scope=repo');
  });

  test('#12: Already-connected student calls connect again - overwrites existing token (re-auth)', async () => {
    // Set initial connection
    student.github_username = 'old_user';
    student.github_access_token = encryption.encrypt('gho_old_token');
    student.github_connected_status = 'connected';
    await student.save();

    const state = jwt.sign({ userId: student._id.toString() }, JWT_SECRET, {
      expiresIn: '15m',
    });

    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'https://github.com/login/oauth/access_token') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: 'gho_new_token_777' }),
        });
      }
      if (url === 'https://api.github.com/user') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ login: 'new_octocat' }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const res = await request(app)
      .get(`/api/auth/github/callback?code=new_code&state=${state}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/settings?github=connected');

    const updatedUser = await User.findById(student._id);
    expect(updatedUser.github_username).toBe('new_octocat');
    expect(updatedUser.github_connected_status).toBe('connected');
    expect(encryption.decrypt(updatedUser.github_access_token)).toBe('gho_new_token_777');
  });
});
