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
  StudentPassport,
  Notification,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let studentA, studentB, studentC, instructor;
let studentAToken, studentBToken, studentCToken, instructorToken;
let notifA1, notifA2, notifA3, notifA4, notifA5;
let notifB1, notifB2;

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

  // Seed Users
  studentA = await User.create({
    name: 'Student A',
    email: 'student_a@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  studentB = await User.create({
    name: 'Student B',
    email: 'student_b@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  studentC = await User.create({
    name: 'Student C',
    email: 'student_c@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor = await User.create({
    name: 'Dr. Instructor',
    email: 'instructor@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  studentAToken = createToken(studentA);
  studentBToken = createToken(studentB);
  studentCToken = createToken(studentC);
  instructorToken = createToken(instructor);

  // Seed Notifications for Student A (3 unread, 2 read) with spaced timestamps
  const baseTime = Date.now();
  notifA1 = await Notification.create({
    user_id: studentA._id,
    type: 'badge_approved',
    message: 'A1 - Badge 1 approved',
    is_read: false,
    created_at: new Date(baseTime + 5000),
  });
  notifA2 = await Notification.create({
    user_id: studentA._id,
    type: 'badge_rejected',
    message: 'A2 - Request 1 rejected',
    is_read: false,
    created_at: new Date(baseTime + 4000),
  });
  notifA3 = await Notification.create({
    user_id: studentA._id,
    type: 'badge_approved',
    message: 'A3 - Badge 2 approved',
    is_read: false,
    created_at: new Date(baseTime + 3000),
  });
  notifA4 = await Notification.create({
    user_id: studentA._id,
    type: 'badge_approved',
    message: 'A4 - Badge 3 approved',
    is_read: true,
    created_at: new Date(baseTime + 2000),
  });
  notifA5 = await Notification.create({
    user_id: studentA._id,
    type: 'badge_rejected',
    message: 'A5 - Request 2 rejected',
    is_read: true,
    created_at: new Date(baseTime + 1000),
  });

  // Seed Notifications for Student B (1 unread, 1 read)
  notifB1 = await Notification.create({
    user_id: studentB._id,
    type: 'badge_approved',
    message: 'B1 - Badge approved',
    is_read: false,
    created_at: new Date(baseTime + 2500),
  });
  notifB2 = await Notification.create({
    user_id: studentB._id,
    type: 'badge_rejected',
    message: 'B2 - Badge rejected',
    is_read: true,
    created_at: new Date(baseTime + 1500),
  });
});

describe('Notification API & Model Unit Tests (TON-123)', () => {
  describe('GET /api/notifications', () => {
    test('#1: Student A lists their notifications - 200, only Student A, sorted newest first', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(5);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(1);
      expect(res.body.hasMore).toBe(false);

      // Verify all belong to student A
      res.body.notifications.forEach((notif) => {
        expect(notif.user_id.toString()).toBe(studentA._id.toString());
      });

      // Verify sorted newest first
      const messages = res.body.notifications.map((n) => n.message);
      expect(messages).toEqual([
        'A1 - Badge 1 approved',
        'A2 - Request 1 rejected',
        'A3 - Badge 2 approved',
        'A4 - Badge 3 approved',
        'A5 - Request 2 rejected',
      ]);
    });

    test('#2: Pagination with ?page=2&limit=2 - 200, correct slice returned, hasMore accurate', async () => {
      const res = await request(app)
        .get('/api/notifications?page=2&limit=2')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(2);
      expect(res.body.page).toBe(2);
      expect(res.body.total).toBe(5);
      expect(res.body.hasMore).toBe(true);

      const messages = res.body.notifications.map((n) => n.message);
      expect(messages).toEqual(['A3 - Badge 2 approved', 'A4 - Badge 3 approved']);
    });

    test('#3: Student with zero notifications - 200, empty array', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentCToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.hasMore).toBe(false);
    });

    test('#4: Unauthenticated request - 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    test('#5: Student A has 3 unread, 2 read - 200, { count: 3 }', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
    });

    test('#6: Student with all read - 200, { count: 0 }', async () => {
      // Mark all of student A's as read first
      await Notification.updateMany({ user_id: studentA._id }, { is_read: true });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    test('#7: Student marks their own unread notification as read - 200, is_read: true', async () => {
      const res = await request(app)
        .put(`/api/notifications/${notifA1._id}/read`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.is_read).toBe(true);

      const updated = await Notification.findById(notifA1._id);
      expect(updated.is_read).toBe(true);
    });

    test("#8: Student attempts to mark another student's notification as read - 404", async () => {
      const res = await request(app)
        .put(`/api/notifications/${notifB1._id}/read`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(404);

      // Verify B's notification is still unread
      const untouched = await Notification.findById(notifB1._id);
      expect(untouched.is_read).toBe(false);
    });

    test('#9: Mark an already-read notification as read again - 200, idempotent, no error', async () => {
      const res = await request(app)
        .put(`/api/notifications/${notifA4._id}/read`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.is_read).toBe(true);
    });

    test('#10: Mark a non-existent notification id - 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    test("#11: Student A has 3 unread - 200, all 3 flip to read, modifiedCount: 3, Student B untouched", async () => {
      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.modifiedCount).toBe(3);

      // Verify Student A has 0 unread
      const unreadA = await Notification.countDocuments({
        user_id: studentA._id,
        is_read: false,
      });
      expect(unreadA).toBe(0);

      // Verify Student B's unread notification remains untouched
      const unreadB = await Notification.countDocuments({
        user_id: studentB._id,
        is_read: false,
      });
      expect(unreadB).toBe(1);
    });
  });

  describe('NotificationService.create + Integration (TON-87 approve/reject)', () => {
    let testCourse, testSkill, testCs, testSss, testVr;

    beforeEach(async () => {
      testCourse = await Course.create({
        name: 'Fullstack Web Dev',
        description: 'Comprehensive course',
        instructor_id: instructor._id,
      });

      testSkill = await MicroSkill.create({
        name: 'React Components',
        description: 'Build reusable UI',
        criteria: 'Build functional React components',
      });

      testCs = await CourseSkill.create({
        course_id: testCourse._id,
        skill_id: testSkill._id,
        passing_criteria: 'Submit working React app',
      });

      testSss = await StudentSkillStatus.create({
        student_id: studentA._id,
        course_skill_id: testCs._id,
        status: 'pending',
      });

      testVr = await VerificationRequest.create({
        student_skill_status_id: testSss._id,
        evidence_url: 'https://github.com/tonedev/repo',
        status: 'pending',
      });
    });

    test('#12: Instructor approves a request - Exactly one Notification{type: "badge_approved"} created for student with skill/course name', async () => {
      const initialNotifsCount = await Notification.countDocuments({
        user_id: studentA._id,
        type: 'badge_approved',
      });

      const res = await request(app)
        .put(`/api/verification-requests/${testVr._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.badge).toBeDefined();

      const newNotifs = await Notification.find({
        user_id: studentA._id,
        type: 'badge_approved',
        related_id: res.body.badge._id,
      });

      expect(newNotifs).toHaveLength(1);
      expect(newNotifs[0].message).toContain('React Components');
      expect(newNotifs[0].message).toContain('Fullstack Web Dev');
      expect(newNotifs[0].is_read).toBe(false);
    });

    test('#13: Instructor rejects a request with feedback - Exactly one Notification{type: "badge_rejected"} created with feedback text', async () => {
      const res = await request(app)
        .put(`/api/verification-requests/${testVr._id}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ feedback: 'Please add unit tests to your repository.' });

      expect(res.status).toBe(200);
      expect(res.body.request.status).toBe('rejected');

      const newNotifs = await Notification.find({
        user_id: studentA._id,
        type: 'badge_rejected',
        related_id: testVr._id,
      });

      expect(newNotifs).toHaveLength(1);
      expect(newNotifs[0].message).toContain('React Components');
      expect(newNotifs[0].message).toContain('Please add unit tests to your repository.');
      expect(newNotifs[0].is_read).toBe(false);
    });

    test('#14: Notification.create throws (e.g. DB error) during approve - Approve endpoint still returns 200 with badge', async () => {
      const createSpy = jest
        .spyOn(Notification, 'create')
        .mockRejectedValueOnce(new Error('Simulated database error'));

      const res = await request(app)
        .put(`/api/verification-requests/${testVr._id}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.badge).toBeDefined();
      expect(res.body.badge.skill_name).toBe('React Components');

      createSpy.mockRestore();
    });
  });
});
