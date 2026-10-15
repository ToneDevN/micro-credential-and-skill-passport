const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { User } = require('../src/models');

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

describe('Edit Profile & Change Password API Unit Tests (TON-149)', () => {
  let user1;
  let user2;
  let token1;

  beforeEach(async () => {
    user1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'oldPassword123',
      role: 'student',
    });

    user2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'passwordBob123',
      role: 'instructor',
    });

    token1 = createToken(user1);
  });

  // Test Cases — PUT /api/users/me (or /api/v1/users/me)
  describe('PUT /api/users/me (Edit Profile - UC-42)', () => {
    // #1 Update name and email to unused values
    it('#1: should update name and email to unused values with 200', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Alice Updated',
          email: 'alice_new@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Alice Updated');
      expect(res.body.user.email).toBe('alice_new@example.com');

      const updatedUser = await User.findById(user1._id);
      expect(updatedUser.name).toBe('Alice Updated');
      expect(updatedUser.email).toBe('alice_new@example.com');
    });

    // #2 Update email to one already used by another user
    it('#2: should return 409 when updating email to one already used by another user', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Alice Johnson',
          email: 'bob@example.com',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email นี้ถูกใช้งานแล้ว');
    });

    // #3 Update email to the user\'s own current email (no-op)
    it('#3: should allow updating email to the user\'s own current email (no-op) with 200', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Alice Still Same',
          email: 'alice@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Alice Still Same');
      expect(res.body.user.email).toBe('alice@example.com');
    });

    // #4 Submit empty name
    it('#4: should return 400 when submitting empty name', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: '   ',
          email: 'alice@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // #5 Unauthenticated request
    it('#5: should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({
          name: 'Anonymous',
          email: 'anon@example.com',
        });

      expect(res.status).toBe(401);
    });
  });

  // Test Cases — PUT /api/users/me/password (Change Password - UC-43)
  describe('PUT /api/users/me/password (Change Password - UC-43)', () => {
    // #6 Correct current password + valid new password
    it('#6: should update password with 200 and allow login with new password', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newBrandPassword456',
          confirmNewPassword: 'newBrandPassword456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('เปลี่ยนรหัสผ่านสำเร็จ');

      // Test login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'newBrandPassword456',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    // #7 Wrong current password
    it('#7: should return 400 "รหัสผ่านปัจจุบันไม่ถูกต้อง" when current password is wrong', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'incorrectPassword',
          newPassword: 'newBrandPassword456',
          confirmNewPassword: 'newBrandPassword456',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('รหัสผ่านปัจจุบันไม่ถูกต้อง');
    });

    // #8 New password same as current
    it('#8: should return 400 "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม" when new password is same as current', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'oldPassword123',
          confirmNewPassword: 'oldPassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
    });

    // #9 New password and confirm mismatch
    it('#9: should return 400 when new password and confirmation mismatch', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newBrandPassword456',
          confirmNewPassword: 'mismatchPassword789',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // #10 New password <8 chars
    it('#10: should return 400 when new password is less than 8 characters', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'short',
          confirmNewPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('8 ตัวอักษร');
    });

    // #11 Unauthenticated request
    it('#11: should return 401 for unauthenticated request to change password', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newBrandPassword456',
          confirmNewPassword: 'newBrandPassword456',
        });

      expect(res.status).toBe(401);
    });

    // #12 Old password no longer works after change
    it('#12: should return 401 on login attempt with old password after password change', async () => {
      await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          currentPassword: 'oldPassword123',
          newPassword: 'newBrandPassword456',
          confirmNewPassword: 'newBrandPassword456',
        });

      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@example.com',
          password: 'oldPassword123',
        });

      expect(oldLoginRes.status).toBe(401);
    });
  });
});
