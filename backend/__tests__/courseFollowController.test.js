const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { User, Course, CourseFollow } = require('../src/models');

let mongoServer;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let student, instructor;
let studentToken, instructorToken;
let course1, course2;

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
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
  await User.deleteMany({});
  await Course.deleteMany({});
  await CourseFollow.deleteMany({});

  instructor = await User.create({
    name: 'Dr. Jane Smith',
    email: 'jane@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student = await User.create({
    name: 'Somchai Student',
    email: 'somchai@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructorToken = createToken(instructor);
  studentToken = createToken(student);

  course1 = await Course.create({
    name: 'Full Stack Engineering',
    description: 'Learn modern web architecture',
    instructor_id: instructor._id,
  });

  course2 = await Course.create({
    name: 'Cloud Infrastructure',
    description: 'AWS and Docker architecture',
    instructor_id: instructor._id,
  });
});

describe('CourseFollow API Tests (TON-223)', () => {
  describe('POST /api/course-follows (Follow Course)', () => {
    it('1. Student follows a course successfully -> 201', async () => {
      const res = await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ course_id: course1._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.follow).toBeDefined();
      expect(res.body.follow.course_id.toString()).toBe(course1._id.toString());
      expect(res.body.follow.student_id.toString()).toBe(student._id.toString());
      expect(res.body.follow.followed_at).toBeDefined();

      const dbFollow = await CourseFollow.findById(res.body.follow._id);
      expect(dbFollow).not.toBeNull();
    });

    it('2. Student cannot follow the same course twice -> 409', async () => {
      await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ course_id: course1._id.toString() });

      const res = await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ course_id: course1._id.toString() });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already following/i);
    });

    it('3. Follow a non-existent course -> 404', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ course_id: fakeId.toString() });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Course not found/i);
    });

    it('4. Follow with missing or invalid course ID -> 400', async () => {
      const res = await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ course_id: 'invalid-id' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Valid course ID is required/i);
    });

    it('5. Instructor cannot follow courses -> 403', async () => {
      const res = await request(app)
        .post('/api/course-follows')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ course_id: course1._id.toString() });

      expect(res.status).toBe(403);
    });

    it('6. Unauthenticated request -> 401', async () => {
      const res = await request(app)
        .post('/api/course-follows')
        .send({ course_id: course1._id.toString() });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/course-follows/:courseId (Unfollow Course)', () => {
    beforeEach(async () => {
      await CourseFollow.create({
        student_id: student._id,
        course_id: course1._id,
      });
    });

    it('7. Student unfollows followed course -> 200', async () => {
      const res = await request(app)
        .delete(`/api/course-follows/${course1._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/unfollowed course/i);

      const dbFollow = await CourseFollow.findOne({
        student_id: student._id,
        course_id: course1._id,
      });
      expect(dbFollow).toBeNull();
    });

    it('8. Student unfollows course they are not following -> 404', async () => {
      const res = await request(app)
        .delete(`/api/course-follows/${course2._id}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Course follow not found/i);
    });

    it('9. Unfollow with invalid ID -> 400', async () => {
      const res = await request(app)
        .delete('/api/course-follows/invalid-id')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/course-follows/me (Get Followed Courses)', () => {
    it('10. Student retrieves their followed courses -> 200 with list', async () => {
      await CourseFollow.create({
        student_id: student._id,
        course_id: course1._id,
      });
      await CourseFollow.create({
        student_id: student._id,
        course_id: course2._id,
      });

      const res = await request(app)
        .get('/api/course-follows/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.followedCourses).toHaveLength(2);
      expect(res.body.followedCourses[0].course_id.name).toBeDefined();
    });

    it('11. Student with no followed courses -> 200 with empty array', async () => {
      const res = await request(app)
        .get('/api/course-follows/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.followedCourses).toEqual([]);
    });
  });
});
