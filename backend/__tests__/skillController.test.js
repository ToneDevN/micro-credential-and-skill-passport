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

  // Seed Courses
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
  // course1 -> skill1, skill2, skill4
  await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });
  await CourseSkill.create({ course_id: course1._id, skill_id: skill4._id });

  // course2 -> skill3, skill4
  await CourseSkill.create({ course_id: course2._id, skill_id: skill3._id });
  await CourseSkill.create({ course_id: course2._id, skill_id: skill4._id });
});

describe('Skill Controller Tests (TON-72)', () => {
  describe('GET /api/skills/search', () => {
    it('7. ?q=express matches skill name and returns matching skills with course associations', async () => {
      const res = await request(app).get('/api/skills/search?q=express');

      expect(res.status).toBe(200);
      expect(res.body.skills).toBeDefined();
      expect(res.body.skills).toHaveLength(1);

      const skill = res.body.skills[0];
      expect(skill.name).toBe('Express.js');
      expect(skill.criteria).toBe('Create a working API');
      expect(skill.courses).toBeDefined();
      expect(skill.courses).toHaveLength(1);
      expect(skill.courses[0].name).toBe('Web Development');
    });

    it('8. ?q=api matches skill description and returns matching skills', async () => {
      const res = await request(app).get('/api/skills/search?q=api');

      expect(res.status).toBe(200);
      expect(res.body.skills).toBeDefined();
      expect(res.body.skills.length).toBeGreaterThanOrEqual(1);

      const names = res.body.skills.map((s) => s.name);
      expect(names).toContain('Express.js');
    });

    it('9. ?q=nonexistent returns 200 with empty skills array', async () => {
      const res = await request(app).get('/api/skills/search?q=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual([]);
    });

    it('10. No q param returns 400 with { message: "Search query is required" }', async () => {
      const res = await request(app).get('/api/skills/search');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query is required');
    });

    it('11. ?q= (empty string) returns 400 validation error', async () => {
      const res = await request(app).get('/api/skills/search?q=');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Search query is required');
    });
  });
});

describe('Micro-Skill Management API Tests (TON-85)', () => {
  let c1, c2, c3;
  let s1, s2, s3, sharedSkill;
  let cs1, cs2, cs3, csShared1, csShared3;

  beforeEach(async () => {
    // Reset and seed data specifically matching TON-85 requirements:
    // - 2 instructors (instructor1, instructor2), 1 student (student)
    // - instructor1 owns c1 (3 skills: s1, s2, s3) and c2 (0 skills)
    // - instructor2 owns c3 (1 skill: sharedSkill)
    // - s1 has approved StudentSkillStatus + Badge
    // - sharedSkill is linked to c1 and c3
    await Course.deleteMany({});
    await MicroSkill.deleteMany({});
    await CourseSkill.deleteMany({});
    await StudentSkillStatus.deleteMany({});
    await StudentPassport.deleteMany({});

    c1 = await Course.create({
      name: 'Web Development',
      description: 'Full-stack web dev',
      instructor_id: instructor1._id,
    });

    c2 = await Course.create({
      name: 'Data Science',
      description: 'Intro to data science',
      instructor_id: instructor1._id,
    });

    c3 = await Course.create({
      name: 'Mobile Dev',
      description: 'Mobile development',
      instructor_id: instructor2._id,
    });

    s1 = await MicroSkill.create({
      name: 'Express.js',
      description: 'REST API development',
      criteria: 'Build a REST API',
    });

    s2 = await MicroSkill.create({
      name: 'React',
      description: 'Frontend development',
      criteria: 'Build a SPA',
    });

    s3 = await MicroSkill.create({
      name: 'Node.js Auth',
      description: 'Authentication',
      criteria: 'Implement JWT auth',
    });

    sharedSkill = await MicroSkill.create({
      name: 'Git',
      description: 'Version control',
      criteria: 'Use Git workflow',
    });

    // Course 1 links: s1, s2, s3, sharedSkill
    cs1 = await CourseSkill.create({ course_id: c1._id, skill_id: s1._id });
    cs2 = await CourseSkill.create({ course_id: c1._id, skill_id: s2._id });
    cs3 = await CourseSkill.create({ course_id: c1._id, skill_id: s3._id });
    csShared1 = await CourseSkill.create({ course_id: c1._id, skill_id: sharedSkill._id });

    // Course 3 links: sharedSkill
    csShared3 = await CourseSkill.create({ course_id: c3._id, skill_id: sharedSkill._id });

    // For badge protection: s1 has approved StudentSkillStatus + Badge
    const approvedStatus = await StudentSkillStatus.create({
      student_id: student._id,
      course_skill_id: cs1._id,
      status: 'approved',
      evidence_url: 'https://github.com/student/express-api',
      reviewed_by: instructor1._id,
      reviewed_at: new Date(),
    });

    await StudentPassport.create({
      student_id: student._id,
      badges: [
        {
          student_skill_status_id: approvedStatus._id,
          skill_name: 'Express.js',
          course_name: 'Web Development',
          issued_at: new Date(),
        },
      ],
    });
  });

  describe('GET /api/courses/:courseId/skills', () => {
    it('1. Course with skills returns populated skills array with name, description, criteria', async () => {
      const res = await request(app)
        .get(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.course).toBeDefined();
      expect(res.body.course._id).toBe(c1._id.toString());
      expect(res.body.course.name).toBe('Web Development');
      expect(res.body.skills).toBeDefined();
      expect(res.body.skills.length).toBeGreaterThanOrEqual(3);

      const skillNames = res.body.skills.map((s) => s.skill_id?.name || s.name);
      expect(skillNames).toContain('Express.js');
      expect(skillNames).toContain('React');
      expect(skillNames).toContain('Node.js Auth');

      const expressSkill = res.body.skills.find(
        (s) => (s.skill_id?.name || s.name) === 'Express.js'
      );
      expect(expressSkill.skill_id.description).toBe('REST API development');
      expect(expressSkill.skill_id.criteria).toBe('Build a REST API');
    });

    it('2. Course with 0 skills returns 200 with empty skills array', async () => {
      const res = await request(app)
        .get(`/api/courses/${c2._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.course).toBeDefined();
      expect(res.body.skills).toEqual([]);
    });

    it('3. Course not found returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/courses/${nonExistentId}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Course not found');
    });

    it("4. Instructor tries to list another instructor's course skills returns 403", async () => {
      const res = await request(app)
        .get(`/api/courses/${c3._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });

    it('5. Unauthenticated request returns 401', async () => {
      const res = await request(app).get(`/api/courses/${c1._id}/skills`);

      expect(res.status).toBe(401);
    });

    it('6. Student tries to access returns 403', async () => {
      const res = await request(app)
        .get(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/courses/:courseId/skills', () => {
    it('7. Valid name + description + criteria creates MicroSkill + CourseSkill', async () => {
      const res = await request(app)
        .post(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Docker Fundamentals',
          description: 'Containerizing full-stack microservices with Docker',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(201);
      expect(res.body.skill).toBeDefined();
      expect(res.body.skill.name).toBe('Docker Fundamentals');
      expect(res.body.courseSkill).toBeDefined();
      expect(res.body.courseSkill.course_id).toBe(c1._id.toString());
      expect(res.body.courseSkill.skill_id).toBe(res.body.skill._id);

      const dbSkill = await MicroSkill.findById(res.body.skill._id);
      expect(dbSkill).not.toBeNull();
      const dbCourseSkill = await CourseSkill.findById(res.body.courseSkill._id);
      expect(dbCourseSkill).not.toBeNull();
    });

    it('8. Missing name returns 400 validation error', async () => {
      const res = await request(app)
        .post(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          description: 'Containerizing full-stack microservices with Docker',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('9. Missing description returns 400 validation error', async () => {
      const res = await request(app)
        .post(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Docker Fundamentals',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/description/i);
    });

    it('10. Missing criteria returns 400 validation error', async () => {
      const res = await request(app)
        .post(`/api/courses/${c1._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Docker Fundamentals',
          description: 'Containerizing full-stack microservices with Docker',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/criteria/i);
    });

    it('11. Course not found returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/courses/${nonExistentId}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Docker Fundamentals',
          description: 'Containerizing full-stack microservices with Docker',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Course not found');
    });

    it("12. Instructor tries to add skill to another instructor's course returns 403", async () => {
      const res = await request(app)
        .post(`/api/courses/${c3._id}/skills`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Docker Fundamentals',
          description: 'Containerizing full-stack microservices with Docker',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });

    it('13. Unauthenticated request returns 401', async () => {
      const res = await request(app)
        .post(`/api/courses/${c1._id}/skills`)
        .send({
          name: 'Docker Fundamentals',
          description: 'Containerizing full-stack microservices with Docker',
          criteria: 'Create a multi-stage Dockerfile and docker-compose deployment',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/courses/:courseId/skills/:skillId', () => {
    it('14. Update name only returns 200, name updated, others unchanged', async () => {
      const res = await request(app)
        .put(`/api/courses/${c1._id}/skills/${s2._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'React 19 & Next.js',
        });

      expect(res.status).toBe(200);
      expect(res.body.skill).toBeDefined();
      expect(res.body.skill.name).toBe('React 19 & Next.js');
      expect(res.body.skill.description).toBe('Frontend development');
      expect(res.body.skill.criteria).toBe('Build a SPA');

      const updated = await MicroSkill.findById(s2._id);
      expect(updated.name).toBe('React 19 & Next.js');
      expect(updated.description).toBe('Frontend development');
    });

    it('15. Update all fields returns 200, all fields updated', async () => {
      const res = await request(app)
        .put(`/api/courses/${c1._id}/skills/${s2._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Advanced React Architecture',
          description: 'Production state machines, suspense, and server actions',
          criteria: 'Construct an enterprise-grade dashboard with real-time sync',
        });

      expect(res.status).toBe(200);
      expect(res.body.skill.name).toBe('Advanced React Architecture');
      expect(res.body.skill.description).toBe(
        'Production state machines, suspense, and server actions'
      );
      expect(res.body.skill.criteria).toBe(
        'Construct an enterprise-grade dashboard with real-time sync'
      );
    });

    it('16. Skill not found in course returns 404', async () => {
      const nonExistentSkillId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/courses/${c1._id}/skills/${nonExistentSkillId}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Non Existent Skill Update',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Skill not found in this course/i);
    });

    it("17. Instructor tries to edit skill in another instructor's course returns 403", async () => {
      const res = await request(app)
        .put(`/api/courses/${c3._id}/skills/${sharedSkill._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`)
        .send({
          name: 'Hacked Git Skill',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });

    it('18. Unauthenticated request returns 401', async () => {
      const res = await request(app)
        .put(`/api/courses/${c1._id}/skills/${s2._id}`)
        .send({
          name: 'Unauthorized update',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/courses/:courseId/skills/:skillId', () => {
    it('19. Delete skill with no badges deletes CourseSkill + MicroSkill', async () => {
      const res = await request(app)
        .delete(`/api/courses/${c1._id}/skills/${s3._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill deleted successfully');

      const cs = await CourseSkill.findById(cs3._id);
      expect(cs).toBeNull();
      const s = await MicroSkill.findById(s3._id);
      expect(s).toBeNull();
    });

    it('20. Delete skill with approved badges returns 400 with "Cannot delete skill with approved badges"', async () => {
      const res = await request(app)
        .delete(`/api/courses/${c1._id}/skills/${s1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot delete skill with approved badges');

      // Verify not deleted
      const cs = await CourseSkill.findById(cs1._id);
      expect(cs).not.toBeNull();
      const s = await MicroSkill.findById(s1._id);
      expect(s).not.toBeNull();
    });

    it('21. Delete skill shared across courses removes only CourseSkill, MicroSkill preserved', async () => {
      const res = await request(app)
        .delete(`/api/courses/${c1._id}/skills/${sharedSkill._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill deleted successfully');

      // CourseSkill for c1 removed
      const csC1 = await CourseSkill.findById(csShared1._id);
      expect(csC1).toBeNull();

      // CourseSkill for c3 still exists
      const csC3 = await CourseSkill.findById(csShared3._id);
      expect(csC3).not.toBeNull();

      // MicroSkill still exists
      const s = await MicroSkill.findById(sharedSkill._id);
      expect(s).not.toBeNull();
    });

    it("22. Instructor tries to delete skill in another instructor's course returns 403", async () => {
      const res = await request(app)
        .delete(`/api/courses/${c3._id}/skills/${sharedSkill._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|own this course/i);
    });
  });
});
