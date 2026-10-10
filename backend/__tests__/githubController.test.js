const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const {
  User,
  Course,
  MicroSkill,
  CourseSkill,
  StudentSkillStatus,
  VerificationRequest,
} = require('../src/models');
const { clearCache } = require('../src/services/githubService');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor, student;
let instructorToken, studentToken;
let course, skill, courseSkill, studentSkillStatus;
let originalFetch;

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '1d',
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  originalFetch = global.fetch;
});

afterAll(async () => {
  global.fetch = originalFetch;
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  clearCache();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // Seed Users
  instructor = await User.create({
    name: 'Dr. Jane Instructor',
    email: 'jane@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student = await User.create({
    name: 'Bob Student',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructorToken = createToken(instructor);
  studentToken = createToken(student);

  // Seed Course and Skill
  course = await Course.create({
    name: 'Web Engineering',
    description: 'Modern Web Engineering',
    instructor_id: instructor._id,
  });

  skill = await MicroSkill.create({
    name: 'Node.js APIs',
    description: 'API development',
    criteria: 'Build APIs',
  });

  courseSkill = await CourseSkill.create({
    course_id: course._id,
    skill_id: skill._id,
  });

  studentSkillStatus = await StudentSkillStatus.create({
    student_id: student._id,
    course_skill_id: courseSkill._id,
    status: 'pending',
  });
});

describe('GitHub Repository Info API Tests (TON-120)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. evidence_url is a valid public GitHub repo URL -> 200, available: true with language/commitCount/lastUpdated/stars', async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/public-repo',
      status: 'pending',
    });

    global.fetch = jest.fn(async (url) => {
      if (url.includes('/commits')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            link: '<https://api.github.com/repositories/1/commits?per_page=1&page=24>; rel="last"',
          }),
          json: async () => [{}],
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          language: 'TypeScript',
          pushed_at: '2026-10-05T09:30:00Z',
          stargazers_count: 12,
        }),
      };
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.language).toBe('TypeScript');
    expect(res.body.commitCount).toBe(24);
    expect(res.body.lastUpdated).toBe('2026-10-05T09:30:00Z');
    expect(res.body.stars).toBe(12);
  });

  it('2. evidence_url is not a GitHub URL (e.g. Google Drive link) -> 200, available: false, no external call made', async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://drive.google.com/file/d/12345/view',
      status: 'pending',
    });

    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("3. evidence_url points to a repo that doesn't exist (GitHub 404) -> 200, available: false, reason: 'not_found'", async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/nonexistent-project',
      status: 'pending',
    });

    global.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Not Found' }),
      };
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('not_found');
  });

  it("4. evidence_url points to a private repo (GitHub 403) -> 200, available: false, reason: 'private'", async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/private-secret-repo',
      status: 'pending',
    });

    global.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 403,
        headers: new Headers({
          'x-ratelimit-remaining': '50',
        }),
        json: async () => ({ message: 'Forbidden' }),
      };
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('private');
  });

  it("5. GitHub API rate-limited (403 with rate-limit headers) -> 200, available: false, reason: 'rate_limited'", async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/some-repo',
      status: 'pending',
    });

    global.fetch = jest.fn(async () => {
      return {
        ok: false,
        status: 403,
        headers: new Headers({
          'x-ratelimit-remaining': '0',
        }),
        json: async () => ({ message: 'API rate limit exceeded for IP' }),
      };
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('rate_limited');
  });

  it('6. Second call for the same repo within 10 min -> Served from cache, no second external call', async () => {
    const vr1 = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/cache-test-repo',
      status: 'pending',
    });

    const vr2 = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/cache-test-repo',
      status: 'pending',
    });

    const fetchSpy = jest.fn(async (url) => {
      if (url.includes('/commits')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [{}],
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          language: 'Python',
          pushed_at: '2026-10-09T08:00:00Z',
          stargazers_count: 5,
        }),
      };
    });

    global.fetch = fetchSpy;

    // First request - should invoke fetch (repo info + commits = 2 calls)
    const res1 = await request(app)
      .get(`/api/verification-requests/${vr1._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.available).toBe(true);
    expect(res1.body.language).toBe('Python');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Second request for the same repo - served from in-memory cache, no new fetch calls!
    const res2 = await request(app)
      .get(`/api/verification-requests/${vr2._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.available).toBe(true);
    expect(res2.body.language).toBe('Python');
    expect(fetchSpy).toHaveBeenCalledTimes(2); // Still 2 calls!
  });

  it('7. evidence_url with trailing slash or .git suffix -> Still parses owner/repo correctly', async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/my-awesome-tool.git/',
      status: 'pending',
    });

    global.fetch = jest.fn(async (url) => {
      expect(url).toContain('repos/alice/my-awesome-tool');
      if (url.includes('/commits')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [{}],
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          language: 'Rust',
          pushed_at: '2026-10-08T14:20:00Z',
          stargazers_count: 88,
        }),
      };
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.language).toBe('Rust');
    expect(res.body.stars).toBe(88);
  });

  it('8. VerificationRequest id does not exist -> 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/verification-requests/${nonExistentId}/github-info`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/verification request not found/i);
  });

  it('9. Student attempts to call this endpoint -> 403', async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/project',
      status: 'pending',
    });

    const res = await request(app)
      .get(`/api/verification-requests/${vr._id}/github-info`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('10. Unauthenticated request -> 401', async () => {
    const vr = await VerificationRequest.create({
      student_skill_status_id: studentSkillStatus._id,
      evidence_url: 'https://github.com/alice/project',
      status: 'pending',
    });

    const res = await request(app).get(
      `/api/verification-requests/${vr._id}/github-info`
    );

    expect(res.status).toBe(401);
  });
});
