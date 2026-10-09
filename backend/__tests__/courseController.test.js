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
  StudentPassport,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor1, instructor2, student;
let instructor1Token, instructor2Token, studentToken;
let course1, course2;
let skill1, skill2, skill3, skill4;

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
  instructor1 = await User.create({
    name: 'Dr. Smith',
    email: 'smith@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  instructor2 = await User.create({
    name: 'Dr. Jones',
    email: 'jones@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student = await User.create({
    name: 'Alice',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor1Token = createToken(instructor1);
  instructor2Token = createToken(instructor2);
  studentToken = createToken(student);

  // Seed Courses for Public tests
  course1 = await Course.create({
    name: 'Web Development',
    description: 'Modern full stack web development with Node and React',
    instructor_id: instructor1._id,
  });

  course2 = await Course.create({
    name: 'Data Science',
    description: 'Data analysis and machine learning basics',
    instructor_id: instructor2._id,
  });

  // Seed Skills
  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'Build REST APIs with Express',
    criteria: 'Create a working API',
  });

  skill2 = await MicroSkill.create({
    name: 'React',
    description: 'Build UI with React',
    criteria: 'Create a SPA',
  });

  skill3 = await MicroSkill.create({
    name: 'Python Pandas',
    description: 'Data manipulation',
    criteria: 'Clean a dataset',
  });

  skill4 = await MicroSkill.create({
    name: 'SQL Queries',
    description: 'Write SQL queries',
    criteria: 'Complex joins',
  });

  // Seed CourseSkill links
  // course1 -> skill1, skill2, skill4 (3 skills)
  await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });
  await CourseSkill.create({ course_id: course1._id, skill_id: skill4._id });

  // course2 -> skill3, skill4 (2 skills)
  await CourseSkill.create({ course_id: course2._id, skill_id: skill3._id });
  await CourseSkill.create({ course_id: course2._id, skill_id: skill4._id });
});

describe('Course Controller Tests (TON-72)', () => {
  describe('GET /api/courses', () => {
    it('1. List all courses with instructor name and skillCount', async () => {
      const res = await request(app).get('/api/courses');

      expect(res.status).toBe(200);
      expect(res.body.courses).toBeDefined();
      expect(res.body.courses).toHaveLength(2);

      const webCourse = res.body.courses.find((c) => c.name === 'Web Development');
      expect(webCourse).toBeDefined();
      expect(webCourse.instructor).toBeDefined();
      expect(webCourse.instructor.name).toBe('Dr. Smith');
      expect(webCourse.skillCount).toBe(3);

      const dsCourse = res.body.courses.find((c) => c.name === 'Data Science');
      expect(dsCourse).toBeDefined();
      expect(dsCourse.instructor.name).toBe('Dr. Jones');
      expect(dsCourse.skillCount).toBe(2);
    });

    it('2. Search courses ?search=web returns only matching courses', async () => {
      const res = await request(app).get('/api/courses?search=web');

      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(1);
      expect(res.body.courses[0].name).toBe('Web Development');
    });

    it('3. Search with no match ?search=zzzzz returns empty array', async () => {
      const res = await request(app).get('/api/courses?search=zzzzz');

      expect(res.status).toBe(200);
      expect(res.body.courses).toEqual([]);
    });
  });

  describe('GET /api/courses/:courseId/skills', () => {
    it('4. Valid courseId returns course info + skills array', async () => {
      const res = await request(app)
        .get(`/api/courses/${course1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.course).toBeDefined();
      expect(res.body.course._id).toBe(course1._id.toString());
      expect(res.body.course.name).toBe('Web Development');
      expect(res.body.course.instructor.name).toBe('Dr. Smith');
      expect(res.body.skills).toBeDefined();
      expect(res.body.skills).toHaveLength(3);

      const skillNames = res.body.skills.map((s) => s.name);
      expect(skillNames).toContain('Express.js');
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('SQL Queries');
    });

    it('5. Non-existent courseId (valid ObjectId) returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/courses/${nonExistentId}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Course not found');
    });

    it('6. Invalid ObjectId format returns 400 error response', async () => {
      const res = await request(app)
        .get('/api/courses/invalid-id-format/skills')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });
  });
});

describe('Course Management CRUD API Tests (TON-82)', () => {
  let inst1Course1, inst1Course2, inst2Course;

  beforeEach(async () => {
    // Clear and setup specific data for TON-82:
    // Instructor1 owns 2 courses:
    //   - inst1Course1: 3 skills (skill1, skill2, skill3)
    //   - inst1Course2: 0 skills
    // Instructor2 owns 1 course:
    //   - inst2Course: 1 skill
    await Course.deleteMany({});
    await CourseSkill.deleteMany({});
    await StudentSkillStatus.deleteMany({});
    await StudentPassport.deleteMany({});

    inst1Course1 = await Course.create({
      name: 'Web Development',
      description: 'Full-stack web development course with Node.js and React',
      instructor_id: instructor1._id,
    });

    inst1Course2 = await Course.create({
      name: 'Cloud Computing',
      description: 'Distributed systems and cloud architecture fundamentals',
      instructor_id: instructor1._id,
    });

    inst2Course = await Course.create({
      name: 'Data Science',
      description: 'Introduction to data science and statistical computing',
      instructor_id: instructor2._id,
    });

    // Course1 has 3 skills, Course2 has 0 skills, inst2Course has 1 skill
    await CourseSkill.create({ course_id: inst1Course1._id, skill_id: skill1._id });
    await CourseSkill.create({ course_id: inst1Course1._id, skill_id: skill2._id });
    await CourseSkill.create({ course_id: inst1Course1._id, skill_id: skill3._id });

    await CourseSkill.create({ course_id: inst2Course._id, skill_id: skill4._id });
  });

  describe('GET /api/courses/my', () => {
    it('1. Instructor with 2 courses returns 200 and 2 courses with skillCount', async () => {
      const res = await request(app)
        .get('/api/courses/my')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courses).toBeDefined();
      expect(res.body.courses).toHaveLength(2);
    });

    it('2. skillCount reflects correct CourseSkill count (course1: 3, course2: 0)', async () => {
      const res = await request(app)
        .get('/api/courses/my')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const c1 = res.body.courses.find((c) => c._id === inst1Course1._id.toString());
      const c2 = res.body.courses.find((c) => c._id === inst1Course2._id.toString());

      expect(c1).toBeDefined();
      expect(c1.skillCount).toBe(3);

      expect(c2).toBeDefined();
      expect(c2.skillCount).toBe(0);
    });

    it('3. Only returns instructor\'s own courses (Instructor1 sees 2, not Instructor2\'s course)', async () => {
      const res = await request(app)
        .get('/api/courses/my')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const courseIds = res.body.courses.map((c) => c._id);
      expect(courseIds).toContain(inst1Course1._id.toString());
      expect(courseIds).toContain(inst1Course2._id.toString());
      expect(courseIds).not.toContain(inst2Course._id.toString());
    });

    it('4. Instructor with no courses returns 200 with empty array', async () => {
      const newInstructor = await User.create({
        name: 'Dr. Newbie',
        email: 'newbie@uni.ac.th',
        password: 'password123',
        role: 'instructor',
      });
      const newInstToken = createToken(newInstructor);

      const res = await request(app)
        .get('/api/courses/my')
        .set('Authorization', `Bearer ${newInstToken}`);

      expect(res.status).toBe(200);
      expect(res.body.courses).toEqual([]);
    });

    it('5. Unauthenticated request to /my returns 401', async () => {
      const res = await request(app).get('/api/courses/my');
      expect(res.status).toBe(401);
    });

    it('6. Student tries to access /my returns 403, instructor only', async () => {
      const res = await request(app)
        .get('/api/courses/my')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/courses', () => {
    it('7. Valid name + description returns 201, course created with instructor_id', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Artificial Intelligence',
          description: 'Introduction to neural networks and deep learning architectures',
        });

      expect(res.status).toBe(201);
      expect(res.body.course).toBeDefined();
      expect(res.body.course.name).toBe('Artificial Intelligence');
      expect(res.body.course.instructor_id.toString()).toBe(instructor1._id.toString());

      const inDb = await Course.findById(res.body.course._id);
      expect(inDb).toBeDefined();
      expect(inDb.name).toBe('Artificial Intelligence');
    });

    it('8. Missing name returns 400 validation error', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          description: 'A valid description for course that lacks name',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('9. Missing description returns 400 validation error', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Valid Name',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/description/i);
    });

    it('10. Name too short (< 2 chars) returns 400 validation error', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'A',
          description: 'A valid description with enough length',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('11. Unauthenticated request to POST /api/courses returns 401', async () => {
      const res = await request(app)
        .post('/api/courses')
        .send({
          name: 'Valid Course',
          description: 'Valid description with enough length',
        });

      expect(res.status).toBe(401);
    });

    it('12. Student tries to create course returns 403', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Student Course',
          description: 'Valid description with enough length',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('13. Update name only returns 200, name updated, description unchanged', async () => {
      const originalDesc = inst1Course1.description;

      const res = await request(app)
        .put(`/api/courses/${inst1Course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Advanced Web Development',
        });

      expect(res.status).toBe(200);
      expect(res.body.course.name).toBe('Advanced Web Development');
      expect(res.body.course.description).toBe(originalDesc);

      const inDb = await Course.findById(inst1Course1._id);
      expect(inDb.name).toBe('Advanced Web Development');
      expect(inDb.description).toBe(originalDesc);
    });

    it('14. Update description only returns 200, description updated, name unchanged', async () => {
      const originalName = inst1Course1.name;

      const res = await request(app)
        .put(`/api/courses/${inst1Course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          description: 'Updated comprehensive curriculum covering TypeScript and Next.js',
        });

      expect(res.status).toBe(200);
      expect(res.body.course.name).toBe(originalName);
      expect(res.body.course.description).toBe(
        'Updated comprehensive curriculum covering TypeScript and Next.js'
      );
    });

    it('15. Course not found (valid non-existent ID) returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/courses/${nonExistentId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Ghost Course',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Course not found');
    });

    it('16. Instructor tries to edit another instructor\'s course returns 403', async () => {
      const res = await request(app)
        .put(`/api/courses/${inst2Course._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Hacked Course',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('17. Unauthenticated request to PUT returns 401', async () => {
      const res = await request(app)
        .put(`/api/courses/${inst1Course1._id}`)
        .send({
          name: 'Unauth Update',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('18. Delete course with no badges returns 200, course and CourseSkills deleted', async () => {
      // inst1Course1 has 3 CourseSkill links but 0 approved badges
      const res = await request(app)
        .delete(`/api/courses/${inst1Course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);

      // Verify course removed
      const inDb = await Course.findById(inst1Course1._id);
      expect(inDb).toBeNull();

      // Verify CourseSkills removed
      const remainingSkills = await CourseSkill.find({ course_id: inst1Course1._id });
      expect(remainingSkills).toHaveLength(0);
    });

    it('19. Delete course with approved badges returns 400 "Cannot delete course with approved badges"', async () => {
      // Seed a CourseSkill -> StudentSkillStatus (approved) -> Badge
      const courseWithBadge = await Course.create({
        name: 'Enterprise Security',
        description: 'Applied cryptography and application vulnerability defense',
        instructor_id: instructor1._id,
      });

      const cs = await CourseSkill.create({
        course_id: courseWithBadge._id,
        skill_id: skill1._id,
      });

      const sss = await StudentSkillStatus.create({
        student_id: student._id,
        course_skill_id: cs._id,
        status: 'approved',
      });

      await StudentPassport.create({
        student_id: student._id,
        badges: [
          {
            student_skill_status_id: sss._id,
            skill_name: 'Express.js',
            course_name: 'Enterprise Security',
            issued_at: new Date(),
          },
        ],
      });

      const res = await request(app)
        .delete(`/api/courses/${courseWithBadge._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/approved badges/i);

      // Ensure course was NOT deleted
      const courseStillExists = await Course.findById(courseWithBadge._id);
      expect(courseStillExists).toBeDefined();
    });

    it('20. Instructor tries to delete another instructor\'s course returns 403', async () => {
      const res = await request(app)
        .delete(`/api/courses/${inst2Course._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);

      const courseStillExists = await Course.findById(inst2Course._id);
      expect(courseStillExists).toBeDefined();
    });
  });
});
