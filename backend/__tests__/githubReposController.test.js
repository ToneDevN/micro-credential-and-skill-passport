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

let connectedStudent, disconnectedStudent, instructor;
let connectedStudentToken, disconnectedStudentToken, instructorToken;

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '1d',
  });
};

const sampleGithubRepos = [
  {
    id: 101,
    name: 'repo-alpha',
    full_name: 'student/repo-alpha',
    description: 'First project repo',
    language: 'JavaScript',
    updated_at: '2026-10-01T12:00:00Z',
    html_url: 'https://github.com/student/repo-alpha',
    private: false,
    owner: { login: 'student', id: 1 },
    permissions: { admin: true, push: true, pull: true },
  },
  {
    id: 102,
    name: 'repo-beta',
    full_name: 'student/repo-beta',
    description: 'Second project repo',
    language: 'TypeScript',
    updated_at: '2026-10-02T12:00:00Z',
    html_url: 'https://github.com/student/repo-beta',
    private: false,
    owner: { login: 'student', id: 1 },
    permissions: { admin: true, push: true, pull: true },
  },
  {
    id: 103,
    name: 'repo-gamma',
    full_name: 'student/repo-gamma',
    description: null,
    language: 'Python',
    updated_at: '2026-10-03T12:00:00Z',
    html_url: 'https://github.com/student/repo-gamma',
    private: false,
    owner: { login: 'student', id: 1 },
    permissions: { admin: true, push: true, pull: true },
  },
  {
    id: 104,
    name: 'repo-delta',
    full_name: 'student/repo-delta',
    description: 'Fourth repo',
    language: null,
    updated_at: '2026-10-04T12:00:00Z',
    html_url: 'https://github.com/student/repo-delta',
    private: false,
    owner: { login: 'student', id: 1 },
    permissions: { admin: true, push: true, pull: true },
  },
  {
    id: 105,
    name: 'repo-epsilon',
    full_name: 'student/repo-epsilon',
    description: 'Fifth repo',
    language: 'HTML',
    updated_at: '2026-10-05T12:00:00Z',
    html_url: 'https://github.com/student/repo-epsilon',
    private: false,
    owner: { login: 'student', id: 1 },
    permissions: { admin: true, push: true, pull: true },
  },
];

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

  // Seed connected student
  connectedStudent = await User.create({
    name: 'Connected Alice',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
    github_username: 'alice_github',
    github_access_token: encryption.encrypt('gho_valid_alice_token'),
    github_connected_status: 'connected',
  });

  // Seed disconnected student
  disconnectedStudent = await User.create({
    name: 'Disconnected Bob',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
    github_username: null,
    github_access_token: null,
    github_connected_status: 'not_connected',
  });

  // Seed instructor
  instructor = await User.create({
    name: 'Dr. Jones',
    email: 'jones@uni.ac.th',
    password: 'password123',
    role: 'instructor',
    github_username: null,
    github_access_token: null,
    github_connected_status: 'not_connected',
  });

  connectedStudentToken = createToken(connectedStudent);
  disconnectedStudentToken = createToken(disconnectedStudent);
  instructorToken = createToken(instructor);

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

describe('Student Repository List API Unit Tests (TON-136)', () => {
  test('#1: Connected student with 5 repos on GitHub - 200, repos array of 5 with 5 whitelisted fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => sampleGithubRepos,
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.repos).toHaveLength(5);
    expect(res.body.repos[0]).toEqual({
      name: 'repo-alpha',
      description: 'First project repo',
      language: 'JavaScript',
      updated_at: '2026-10-01T12:00:00Z',
      html_url: 'https://github.com/student/repo-alpha',
    });
  });

  test('#2: Student with no github_access_token - 400 { error: "NOT_CONNECTED" }, no external call made', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${disconnectedStudentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_CONNECTED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('#3: GitHub returns 401 (token revoked) - 401 { error: "TOKEN_EXPIRED" } & status flips to not_connected', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');

    const user = await User.findById(connectedStudent._id);
    expect(user.github_connected_status).toBe('not_connected');
  });

  test('#4: GitHub returns 403 with rate-limit headers - 429 { error: "RATE_LIMIT_EXCEEDED" }', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'API rate limit exceeded' }),
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('#5: GitHub request times out (>5s) - Treated as API_UNAVAILABLE, does not hang', async () => {
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('API_UNAVAILABLE');
  });

  test('#6: Student with zero repos on GitHub - 200, { repos: [] }', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.repos).toEqual([]);
  });

  test('#7: Response strips extra GitHub fields (id, owner, permissions, etc.) - Only 5 whitelisted fields present', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [sampleGithubRepos[0]],
    });

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(200);
    const repo = res.body.repos[0];
    const allowedKeys = ['name', 'description', 'language', 'updated_at', 'html_url'];
    expect(Object.keys(repo).sort()).toEqual(allowedKeys.sort());
    expect(repo.id).toBeUndefined();
    expect(repo.owner).toBeUndefined();
    expect(repo.permissions).toBeUndefined();
    expect(repo.private).toBeUndefined();
  });

  test('#8: Unauthenticated request - 401', async () => {
    const res = await request(app).get('/api/users/me/github/repos');
    expect(res.status).toBe(401);
  });

  test('#9: Instructor calls this endpoint - 200 if connected, NOT_CONNECTED otherwise', async () => {
    // 1. Instructor without connection -> 400 NOT_CONNECTED
    const resNotConnected = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(resNotConnected.status).toBe(400);
    expect(resNotConnected.body.error).toBe('NOT_CONNECTED');

    // 2. Instructor with connected status -> 200
    instructor.github_connected_status = 'connected';
    instructor.github_access_token = encryption.encrypt('gho_instructor_token');
    await instructor.save();

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [sampleGithubRepos[0]],
    });

    const resConnected = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(resConnected.status).toBe(200);
    expect(resConnected.body.repos).toHaveLength(1);
  });

  test('#10: per_page=100 and sort=updated params sent to GitHub - outbound call params verified', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });

    await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(fetchSpy).toHaveBeenCalled();
    const outboundUrl = fetchSpy.mock.calls[0][0];
    expect(outboundUrl).toContain('per_page=100');
    expect(outboundUrl).toContain('sort=updated');
  });

  test('#11: Decryption of a corrupted/invalid stored token - handled gracefully, returns API_UNAVAILABLE', async () => {
    connectedStudent.github_access_token = 'corrupted_unsplit_token_data';
    await connectedStudent.save();

    const res = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('API_UNAVAILABLE');
  });

  test('#12: Two different students each get only their own repos - no cross-contamination between users', async () => {
    const student2 = await User.create({
      name: 'Student Two',
      email: 'student2@uni.ac.th',
      password: 'password123',
      role: 'student',
      github_username: 'student2_gh',
      github_access_token: encryption.encrypt('gho_student2_token'),
      github_connected_status: 'connected',
    });
    const student2Token = createToken(student2);

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url, options) => {
      const authHeader = options.headers.Authorization;
      if (authHeader === 'token gho_valid_alice_token') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [sampleGithubRepos[0]],
        });
      }
      if (authHeader === 'token gho_student2_token') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [sampleGithubRepos[1]],
        });
      }
      return Promise.reject(new Error('Unexpected auth header'));
    });

    const res1 = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${connectedStudentToken}`);

    const res2 = await request(app)
      .get('/api/users/me/github/repos')
      .set('Authorization', `Bearer ${student2Token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.repos[0].name).toBe('repo-alpha');

    expect(res2.status).toBe(200);
    expect(res2.body.repos[0].name).toBe('repo-beta');
  });
});
