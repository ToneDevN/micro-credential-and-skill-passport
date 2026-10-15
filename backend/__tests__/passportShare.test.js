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
  Enrollment,
  StudentSkillStatus,
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

const createToken = (user) => {
  return jwt.sign({ id: user._id.toString(), role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Public Passport Sharing API Unit Tests (TON-152, TON-140)', () => {
  let student1, student2, emptyStudent;
  let token1, token2, emptyToken;
  let course, skill, courseSkill, sss1, sss2;

  beforeEach(async () => {
    // 1. Create Users
    student1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'password123',
      role: 'student',
      github_username: 'alice-gh',
      github_connected_status: 'connected',
    });

    student2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'password123',
      role: 'student',
      github_username: 'bob-gh',
      github_connected_status: 'connected',
    });

    emptyStudent = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'password123',
      role: 'student',
    });

    token1 = createToken(student1);
    token2 = createToken(student2);
    emptyToken = createToken(emptyStudent);

    // 2. Setup Courses & Skills for context
    course = await Course.create({
      name: 'Fullstack Web Development',
      description: 'Intro to Fullstack',
      instructor_id: new mongoose.Types.ObjectId(),
    });

    skill = await MicroSkill.create({
      name: 'Node.js API Design',
      description: 'Design and build RESTful APIs with Node.js and Express',
      criteria: 'Pass 100% of integration tests and rubric',
    });

    courseSkill = await CourseSkill.create({
      course_id: course._id,
      skill_id: skill._id,
      order: 1,
    });

    sss1 = await StudentSkillStatus.create({
      student_id: student1._id,
      course_id: course._id,
      course_skill_id: courseSkill._id,
      status: 'approved',
    });

    sss2 = await StudentSkillStatus.create({
      student_id: student2._id,
      course_id: course._id,
      course_skill_id: courseSkill._id,
      status: 'approved',
    });

    // 3. Setup Passports
    await StudentPassport.create({
      student_id: student1._id,
      badges: [
        {
          student_skill_status_id: sss1._id,
          skill_name: 'Node.js API Design',
          course_name: 'Fullstack Web Development',
          issued_at: new Date('2026-10-01'),
        },
      ],
    });

    await StudentPassport.create({
      student_id: student2._id,
      badges: [
        {
          student_skill_status_id: sss2._id,
          skill_name: 'React Components',
          course_name: 'Frontend Development',
          issued_at: new Date('2026-10-02'),
        },
      ],
    });

    await StudentPassport.create({
      student_id: emptyStudent._id,
      badges: [],
    });
  });

  // #1 Student with >=1 badge generates a share link for the first time
  it('#1: should return 201, public_slug created, and is_public: true on first share', async () => {
    const res = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.publicSlug).toBeDefined();
    expect(res.body.publicUrl).toBe(`/passport/${res.body.publicSlug}`);
    expect(res.body.isPublic).toBe(true);

    const passport = await StudentPassport.findOne({ student_id: student1._id });
    expect(passport.public_slug).toBe(res.body.publicSlug);
    expect(passport.is_public).toBe(true);
  });

  // #2 Student with 0 badges attempts to share
  it('#2: should return 400 when student with 0 badges attempts to share', async () => {
    const res = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const passport = await StudentPassport.findOne({ student_id: emptyStudent._id });
    expect(passport.public_slug).toBeNull();
    expect(passport.is_public).toBe(false);
  });

  // #3 Student calls share again with an existing slug (idempotent)
  it('#3: should return 200 with the existing slug (idempotent), not generating a new one', async () => {
    // First share -> 201
    const res1 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    expect(res1.status).toBe(201);
    const initialSlug = res1.body.publicSlug;

    // Second share -> 200, same slug
    const res2 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    expect(res2.status).toBe(200);
    expect(res2.body.publicSlug).toBe(initialSlug);
    expect(res2.body.publicUrl).toBe(`/passport/${initialSlug}`);
  });

  // #4 Student regenerates the link
  it('#4: should regenerate a new slug differing from the old one, and old slug immediately 404s', async () => {
    // Initial share
    const res1 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const oldSlug = res1.body.publicSlug;

    // Verify old slug works
    const oldPublicRes = await request(app).get(`/api/passport/public/${oldSlug}`);
    expect(oldPublicRes.status).toBe(200);

    // Regenerate
    const regenRes = await request(app)
      .post('/api/passport/share/regenerate')
      .set('Authorization', `Bearer ${token1}`);
    expect(regenRes.status).toBe(201);
    const newSlug = regenRes.body.publicSlug;
    expect(newSlug).not.toBe(oldSlug);

    // Old slug should now 404
    const oldSlugAfterRes = await request(app).get(`/api/passport/public/${oldSlug}`);
    expect(oldSlugAfterRes.status).toBe(404);

    // New slug should return 200
    const newPublicRes = await request(app).get(`/api/passport/public/${newSlug}`);
    expect(newPublicRes.status).toBe(200);
  });

  // #5 Student revokes sharing (DELETE)
  it('#5: should set is_public: false, clear public_slug, and public URL 404s', async () => {
    // Initial share
    const res1 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const slug = res1.body.publicSlug;

    // Revoke share
    const delRes = await request(app)
      .delete('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Check DB state
    const passport = await StudentPassport.findOne({ student_id: student1._id });
    expect(passport.is_public).toBe(false);
    expect(passport.public_slug).toBeNull();

    // Public view should 404
    const publicRes = await request(app).get(`/api/passport/public/${slug}`);
    expect(publicRes.status).toBe(404);
  });

  // #6 Visitor views a valid public slug
  it('#6: should return 200 with whitelisted fields when viewing a valid public slug', async () => {
    const shareRes = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const slug = shareRes.body.publicSlug;

    const res = await request(app).get(`/api/passport/public/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.studentName).toBe('Alice Johnson');
    expect(Array.isArray(res.body.badges)).toBe(true);
    expect(res.body.badges.length).toBe(1);
    expect(res.body.badges[0].skill_name).toBe('Node.js API Design');
    expect(res.body.badges[0].course_name).toBe('Fullstack Web Development');
    expect(res.body.badges[0].issued_at).toBeDefined();
    expect(res.body.skillMap).toBeDefined();
  });

  // #7 Response never includes email/password_hash/github fields
  it('#7: should NEVER leak email, password_hash, or github fields in public view', async () => {
    const shareRes = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const slug = shareRes.body.publicSlug;

    const res = await request(app).get(`/api/passport/public/${slug}`);
    expect(res.status).toBe(200);

    // Explicit field-by-field assertion on sensitive data
    expect(res.body.email).toBeUndefined();
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body.github_username).toBeUndefined();
    expect(res.body.github_access_token).toBeUndefined();
    expect(res.body.github_connected_status).toBeUndefined();
    expect(res.body._id).toBeUndefined();
    expect(res.body.student_id).toBeUndefined();

    // Verify JSON string representation has zero occurrences
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('alice@example.com');
    expect(jsonStr).not.toContain('alice-gh');
    expect(jsonStr).not.toContain('password_hash');
  });

  // #8 Visitor views a nonexistent slug
  it('#8: should return 404 when visitor views a nonexistent slug', async () => {
    const res = await request(app).get('/api/passport/public/nonexistent-slug-12345');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // #9 Visitor views a revoked slug
  it('#9: should return 404 when visitor views an expired or revoked slug', async () => {
    // Generate slug
    const shareRes = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const slug = shareRes.body.publicSlug;

    // Revoke
    await request(app)
      .delete('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);

    // Visitor views revoked slug
    const res = await request(app).get(`/api/passport/public/${slug}`);
    expect(res.status).toBe(404);
  });

  // #10 Two different students' slugs never collide
  it('#10: should ensure two different students have distinct slugs that resolve to the correct student', async () => {
    const res1 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const res2 = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token2}`);

    const slug1 = res1.body.publicSlug;
    const slug2 = res2.body.publicSlug;

    expect(slug1).not.toBe(slug2);

    const public1 = await request(app).get(`/api/passport/public/${slug1}`);
    const public2 = await request(app).get(`/api/passport/public/${slug2}`);

    expect(public1.status).toBe(200);
    expect(public1.body.studentName).toBe('Alice Johnson');
    expect(public1.body.badges[0].skill_name).toBe('Node.js API Design');

    expect(public2.status).toBe(200);
    expect(public2.body.studentName).toBe('Bob Smith');
    expect(public2.body.badges[0].skill_name).toBe('React Components');
  });

  // #11 Unauthenticated request to POST /share
  it('#11: should return 401 when calling POST /api/passport/share without auth', async () => {
    const res = await request(app).post('/api/passport/share');
    expect(res.status).toBe(401);
  });

  // #12 Public view endpoint requires no auth header at all
  it('#12: should return 200 without any Authorization header for public view', async () => {
    const shareRes = await request(app)
      .post('/api/passport/share')
      .set('Authorization', `Bearer ${token1}`);
    const slug = shareRes.body.publicSlug;

    // Send request with no headers / no token
    const res = await request(app).get(`/api/passport/public/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.studentName).toBe('Alice Johnson');
  });
});
