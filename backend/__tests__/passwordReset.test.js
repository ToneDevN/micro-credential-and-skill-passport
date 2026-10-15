const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { User } = require('../src/models');
const mailer = require('../src/utils/mailer');

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

afterEach(async () => {
  jest.restoreAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Forgot/Reset Password API Unit Tests (TON-146)', () => {
  const genericMessage = 'ส่งลิงก์ reset รหัสผ่านไปที่ email ของคุณแล้ว';
  let registeredUser;

  beforeEach(async () => {
    registeredUser = await User.create({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'initialPassword123',
      role: 'student',
    });
  });

  // #1 Forgot-password with a registered email
  it('#1: should return 200 generic message and save token + expiry for registered email', async () => {
    const mailSpy = jest.spyOn(mailer, 'sendResetPasswordEmail').mockResolvedValue({ success: true });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'student@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain(genericMessage);

    const user = await User.findById(registeredUser._id);
    expect(user.password_reset_token).toBeDefined();
    expect(user.password_reset_token).not.toBeNull();
    expect(user.password_reset_expires_at).toBeDefined();
    expect(new Date(user.password_reset_expires_at).getTime()).toBeGreaterThan(Date.now());

    expect(mailSpy).toHaveBeenCalledTimes(1);
    expect(mailSpy).toHaveBeenCalledWith(
      'student@example.com',
      expect.stringContaining(user.password_reset_token)
    );
  });

  // #2 Forgot-password with an unregistered email
  it('#2: should return 200 generic message without mutating DB or sending email for unregistered email', async () => {
    const mailSpy = jest.spyOn(mailer, 'sendResetPasswordEmail');

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain(genericMessage);

    expect(mailSpy).not.toHaveBeenCalled();

    const user = await User.findById(registeredUser._id);
    expect(user.password_reset_token).toBeNull();
  });

  // #3 Email send failure (mocked)
  it('#3: should return 500 when email sending fails so user can retry', async () => {
    jest.spyOn(mailer, 'sendResetPasswordEmail').mockRejectedValue(new Error('SMTP connection failed'));

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'student@example.com' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('เกิดข้อผิดพลาดในการส่งอีเมล');
  });

  // #4 GET validate with a valid, unexpired token
  it('#4: should return { valid: true } when validating a valid unexpired token', async () => {
    registeredUser.password_reset_token = 'valid-token-123';
    registeredUser.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30m in future
    await registeredUser.save();

    const res = await request(app).get('/api/auth/reset-password/valid-token-123');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  // #5 GET validate with an expired token
  it('#5: should return { valid: false } when validating an expired token', async () => {
    registeredUser.password_reset_token = 'expired-token-123';
    registeredUser.password_reset_expires_at = new Date(Date.now() - 5 * 60 * 1000); // 5m in past
    await registeredUser.save();

    const res = await request(app).get('/api/auth/reset-password/expired-token-123');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });

  // #6 GET validate with a nonexistent token
  it('#6: should return { valid: false } when validating a nonexistent token', async () => {
    const res = await request(app).get('/api/auth/reset-password/nonexistent-token');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });

  // #7 Reset with valid token + matching passwords >=8 chars
  it('#7: should reset password with 200, update password_hash, and clear token fields', async () => {
    registeredUser.password_reset_token = 'active-reset-token';
    registeredUser.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await registeredUser.save();

    const res = await request(app)
      .post('/api/auth/reset-password/active-reset-token')
      .send({
        password: 'brandNewPassword123',
        confirmPassword: 'brandNewPassword123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('เปลี่ยนรหัสผ่านสำเร็จ');

    const updatedUser = await User.findById(registeredUser._id);
    expect(updatedUser.password_reset_token).toBeNull();
    expect(updatedUser.password_reset_expires_at).toBeNull();

    const isMatch = await updatedUser.comparePassword('brandNewPassword123');
    expect(isMatch).toBe(true);
  });

  // #8 Reset with mismatched password/confirmPassword
  it('#8: should return 400 when password and confirmPassword mismatch', async () => {
    registeredUser.password_reset_token = 'active-reset-token';
    registeredUser.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await registeredUser.save();

    const res = await request(app)
      .post('/api/auth/reset-password/active-reset-token')
      .send({
        password: 'brandNewPassword123',
        confirmPassword: 'mismatchPassword456',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ไม่ตรงกัน');
  });

  // #9 Reset with password <8 chars
  it('#9: should return 400 when password length is less than 8 chars', async () => {
    registeredUser.password_reset_token = 'active-reset-token';
    registeredUser.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await registeredUser.save();

    const res = await request(app)
      .post('/api/auth/reset-password/active-reset-token')
      .send({
        password: 'short',
        confirmPassword: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('8 ตัวอักษร');
  });

  // #10 Reset with expired token
  it('#10: should return 400 "ลิงก์หมดอายุแล้ว" when token is expired', async () => {
    registeredUser.password_reset_token = 'expired-token';
    registeredUser.password_reset_expires_at = new Date(Date.now() - 1000);
    await registeredUser.save();

    const res = await request(app)
      .post('/api/auth/reset-password/expired-token')
      .send({
        password: 'brandNewPassword123',
        confirmPassword: 'brandNewPassword123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ลิงก์หมดอายุแล้ว');
  });

  // #11 Reset with an already-used (cleared) token
  it('#11: should return 400 expired error when using an already-used or cleared token', async () => {
    // User token is null (already used)
    const res = await request(app)
      .post('/api/auth/reset-password/already-used-token')
      .send({
        password: 'brandNewPassword123',
        confirmPassword: 'brandNewPassword123',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('ลิงก์หมดอายุแล้ว');
  });

  // #12 Login still works with the new password after reset
  it('#12: should allow user to login with the new password after password reset', async () => {
    registeredUser.password_reset_token = 'login-reset-token';
    registeredUser.password_reset_expires_at = new Date(Date.now() + 30 * 60 * 1000);
    await registeredUser.save();

    await request(app)
      .post('/api/auth/reset-password/login-reset-token')
      .send({
        password: 'newValidPassword123!',
        confirmPassword: 'newValidPassword123!',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'newValidPassword123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe('student@example.com');
  });
});
