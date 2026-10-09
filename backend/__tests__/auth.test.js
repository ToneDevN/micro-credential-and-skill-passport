const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { User, StudentPassport } = require('../src/models');

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

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

describe('POST /api/auth/register', () => {
  it('should register a new student and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student One',
        email: 'student1@example.com',
        password: 'password123',
        role: 'student',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      name: 'Student One',
      email: 'student1@example.com',
      role: 'student',
    });
  });

  it('should register a new instructor and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Instructor One',
        email: 'instructor1@example.com',
        password: 'password123',
        role: 'instructor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('instructor');
  });

  it('should return 409 if email already exists', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'password123',
        role: 'student',
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'duplicate@example.com',
        password: 'password123',
        role: 'student',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already in use/i);
  });

  it('should return 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'noname@example.com',
        password: 'password123',
        role: 'student',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 if email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'password123',
        role: 'student',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 if password is less than 6 chars', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short Pass',
        email: 'shortpass@example.com',
        password: '123',
        role: 'student',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 if role is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bad Role',
        email: 'badrole@example.com',
        password: 'password123',
        role: 'admin',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should create StudentPassport when role is student', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Passport Student',
        email: 'passport@example.com',
        password: 'password123',
        role: 'student',
      });

    expect(res.status).toBe(201);
    const passport = await StudentPassport.findOne({ student_id: res.body.user.id });
    expect(passport).not.toBeNull();
    expect(passport.badges).toHaveLength(0);
  });

  it('should NOT store plaintext password in DB', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hashed User',
        email: 'hashcheck@example.com',
        password: 'plainpassword123',
        role: 'student',
      });

    const userInDb = await User.findOne({ email: 'hashcheck@example.com' });
    expect(userInDb).not.toBeNull();
    expect(userInDb.password_hash).not.toBe('plainpassword123');
    expect(userInDb.password_hash).toMatch(/^\$2[aby]\$/);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await User.create({
      name: 'Test Login User',
      email: 'login@example.com',
      password: 'mypassword123',
      role: 'student',
    });
  });

  it('should login with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'mypassword123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should return 401 for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'mypassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'mypassword123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('JWT payload should contain id and role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'mypassword123',
      });

    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.id).toBeDefined();
    expect(decoded.role).toBe('student');
  });
});

describe('POST /api/auth/logout', () => {
  it('should return 200 on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logged out');
  });
});

describe('Auth Middleware', () => {
  let studentUser;
  let instructorUser;
  let studentToken;
  let instructorToken;

  beforeEach(async () => {
    studentUser = await User.create({
      name: 'Alice Student',
      email: 'alice@test.com',
      password: 'password123',
      role: 'student',
    });

    instructorUser = await User.create({
      name: 'Bob Instructor',
      email: 'bob@test.com',
      password: 'password123',
      role: 'instructor',
    });

    studentToken = jwt.sign(
      { id: studentUser._id.toString(), role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    instructorToken = jwt.sign(
      { id: instructorUser._id.toString(), role: 'instructor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('protect middleware', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 if token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: studentUser._id.toString(), role: 'student' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token/i);
    });

    it('should return 401 if token is malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid token/i);
    });

    it('should attach req.user on valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toMatchObject({
        email: 'alice@test.com',
        role: 'student',
      });
    });
  });

  describe('restrictTo middleware', () => {
    it('should return 403 if student accesses instructor route', async () => {
      const res = await request(app)
        .get('/api/instructor/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it('should return 403 if instructor accesses student route', async () => {
      const res = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });

    it('should pass through if role matches', async () => {
      const studentRes = await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentRes.status).toBe(200);
      expect(studentRes.body.success).toBe(true);

      const instructorRes = await request(app)
        .get('/api/instructor/dashboard')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(instructorRes.status).toBe(200);
      expect(instructorRes.body.success).toBe(true);
    });
  });
});
