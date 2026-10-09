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
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let student1, student2, instructor;
let student1Token, student2Token, instructorToken;
let course1, course2;
let skill1, skill2, skill3, skill4;
let courseSkill1, courseSkill2, courseSkill3, courseSkill4;
let sssApproved1, sssApproved2, sssPending;

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
  student1 = await User.create({
    name: 'Alice',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  student2 = await User.create({
    name: 'Bob',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor = await User.create({
    name: 'Dr. Smith',
    email: 'smith@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  student1Token = createToken(student1);
  student2Token = createToken(student2);
  instructorToken = createToken(instructor);

  // Seed Courses
  course1 = await Course.create({
    name: 'Web Development',
    description: 'Full stack development',
    instructor_id: instructor._id,
  });

  course2 = await Course.create({
    name: 'Data Science',
    description: 'Data analysis and manipulation',
    instructor_id: instructor._id,
  });

  // Seed Skills
  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'REST APIs',
    criteria: 'Build an API',
  });

  skill2 = await MicroSkill.create({
    name: 'React',
    description: 'Frontend',
    criteria: 'Build a SPA',
  });

  skill3 = await MicroSkill.create({
    name: 'Python Pandas',
    description: 'Data manipulation',
    criteria: 'Clean a dataset',
  });

  skill4 = await MicroSkill.create({
    name: 'SQL Queries',
    description: 'Database',
    criteria: 'Complex joins',
  });

  // CourseSkill links: course1 -> skill1, skill2; course2 -> skill3, skill4
  courseSkill1 = await CourseSkill.create({
    course_id: course1._id,
    skill_id: skill1._id,
  });

  courseSkill2 = await CourseSkill.create({
    course_id: course1._id,
    skill_id: skill2._id,
  });

  courseSkill3 = await CourseSkill.create({
    course_id: course2._id,
    skill_id: skill3._id,
  });

  courseSkill4 = await CourseSkill.create({
    course_id: course2._id,
    skill_id: skill4._id,
  });

  // Enrollments: student1 enrolled in both courses
  await Enrollment.create({
    student_id: student1._id,
    course_id: course1._id,
    status: 'active',
  });

  await Enrollment.create({
    student_id: student1._id,
    course_id: course2._id,
    status: 'active',
  });

  // StudentSkillStatus for student1:
  // student1 + courseSkill1 (Express.js) -> approved
  // student1 + courseSkill3 (Pandas) -> approved
  // student1 + courseSkill2 (React) -> pending
  // courseSkill4 (SQL Queries) -> not created (not_started)
  sssApproved1 = await StudentSkillStatus.findOneAndUpdate(
    { student_id: student1._id, course_skill_id: courseSkill1._id },
    { status: 'approved' },
    { upsert: true, new: true }
  );

  sssApproved2 = await StudentSkillStatus.findOneAndUpdate(
    { student_id: student1._id, course_skill_id: courseSkill3._id },
    { status: 'approved' },
    { upsert: true, new: true }
  );

  sssPending = await StudentSkillStatus.findOneAndUpdate(
    { student_id: student1._id, course_skill_id: courseSkill2._id },
    { status: 'pending' },
    { upsert: true, new: true }
  );

  // StudentPassport for student1 with 2 badges
  await StudentPassport.create({
    student_id: student1._id,
    badges: [
      {
        student_skill_status_id: sssApproved1._id,
        skill_name: 'Express.js',
        course_name: 'Web Development',
        issued_at: new Date('2026-10-01'),
      },
      {
        student_skill_status_id: sssApproved2._id,
        skill_name: 'Python Pandas',
        course_name: 'Data Science',
        issued_at: new Date('2026-10-05'),
      },
    ],
  });

  // student2 has no passport doc created yet
});

describe('Skill Passport API Tests (TON-79)', () => {
  describe('GET /api/passport/my', () => {
    it('1. Student with 2 badges returns 200, passport with 2 badges + totalBadges = 2', async () => {
      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.passport).toBeDefined();
      expect(res.body.passport.badges).toHaveLength(2);
      expect(res.body.passport.totalBadges).toBe(2);
      expect(res.body.stats.totalBadges).toBe(2);
    });

    it('2. Student with no badges (empty passport) returns { badges: [], totalBadges: 0 }', async () => {
      // Create empty passport for student2
      await StudentPassport.create({
        student_id: student2._id,
        badges: [],
      });

      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.passport).toBeDefined();
      expect(res.body.passport.badges).toEqual([]);
      expect(res.body.passport.totalBadges).toBe(0);
      expect(res.body.stats.totalBadges).toBe(0);
      expect(res.body.stats.badgesByCourse).toEqual([]);
    });

    it('3. Student with no passport doc (first access) auto-creates empty passport', async () => {
      // student2 currently has no passport doc in DB
      const existing = await StudentPassport.findOne({ student_id: student2._id });
      expect(existing).toBeNull();

      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.passport).toBeDefined();
      expect(res.body.passport.badges).toEqual([]);
      expect(res.body.passport.totalBadges).toBe(0);

      const created = await StudentPassport.findOne({ student_id: student2._id });
      expect(created).toBeDefined();
      expect(created.badges).toHaveLength(0);
    });

    it('4. Badges include snapshot fields (skill_name, course_name, issued_at)', async () => {
      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const badges = res.body.passport.badges;
      expect(badges).toHaveLength(2);

      const b1 = badges.find((b) => b.skill_name === 'Express.js');
      expect(b1).toBeDefined();
      expect(b1.course_name).toBe('Web Development');
      expect(b1.issued_at).toBeDefined();
      expect(b1.student_skill_status_id).toBe(sssApproved1._id.toString());

      const b2 = badges.find((b) => b.skill_name === 'Python Pandas');
      expect(b2).toBeDefined();
      expect(b2.course_name).toBe('Data Science');
      expect(b2.issued_at).toBeDefined();
    });

    it('5. badgesByCourse groups correctly and returns counts', async () => {
      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const { badgesByCourse } = res.body.stats;
      expect(badgesByCourse).toHaveLength(2);

      const webCourseGroup = badgesByCourse.find(
        (g) => g.courseName === 'Web Development'
      );
      expect(webCourseGroup).toBeDefined();
      expect(webCourseGroup.count).toBe(1);

      const dsCourseGroup = badgesByCourse.find(
        (g) => g.courseName === 'Data Science'
      );
      expect(dsCourseGroup).toBeDefined();
      expect(dsCourseGroup.count).toBe(1);
    });

    it('6. Unauthenticated request returns 401', async () => {
      const res = await request(app).get('/api/passport/my');
      expect(res.status).toBe(401);
    });

    it('7. Instructor tries to access returns 403, student only', async () => {
      const res = await request(app)
        .get('/api/passport/my')
        .set('Authorization', `Bearer ${instructorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/passport/my/skill-map', () => {
    it('8. Student enrolled in 2 courses with mixed statuses returns 2 courses with skills + correct status per skill', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(2);

      const courseNames = res.body.courses.map((c) => c.name);
      expect(courseNames).toContain('Web Development');
      expect(courseNames).toContain('Data Science');
    });

    it('9. Skill with approved status → "earned", badge object present', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const webCourse = res.body.courses.find(
        (c) => c.name === 'Web Development'
      );
      const expressSkill = webCourse.skills.find(
        (s) => s.name === 'Express.js'
      );

      expect(expressSkill).toBeDefined();
      expect(expressSkill.status).toBe('earned');
      expect(expressSkill.badge).toBeDefined();
      expect(expressSkill.badge.issued_at).toBeDefined();
    });

    it('10. Skill with pending status → "pending", badge = null', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const webCourse = res.body.courses.find(
        (c) => c.name === 'Web Development'
      );
      const reactSkill = webCourse.skills.find((s) => s.name === 'React');

      expect(reactSkill).toBeDefined();
      expect(reactSkill.status).toBe('pending');
      expect(reactSkill.badge).toBeNull();
    });

    it('11. Skill with no StudentSkillStatus → "not_started", badge = null', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const dsCourse = res.body.courses.find((c) => c.name === 'Data Science');
      const sqlSkill = dsCourse.skills.find((s) => s.name === 'SQL Queries');

      expect(sqlSkill).toBeDefined();
      expect(sqlSkill.status).toBe('not_started');
      expect(sqlSkill.badge).toBeNull();
    });

    it('12. Skill with expired status → "expired"', async () => {
      // Update sssPending to expired
      sssPending.status = 'expired';
      await sssPending.save();

      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const webCourse = res.body.courses.find(
        (c) => c.name === 'Web Development'
      );
      const reactSkill = webCourse.skills.find((s) => s.name === 'React');

      expect(reactSkill).toBeDefined();
      expect(reactSkill.status).toBe('expired');
    });

    it('13. Course-level stats correct (earnedSkills / totalSkills / completionRate)', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);

      // Web Development has 2 skills: Express.js (earned), React (pending)
      const webCourse = res.body.courses.find(
        (c) => c.name === 'Web Development'
      );
      expect(webCourse.totalSkills).toBe(2);
      expect(webCourse.earnedSkills).toBe(1);
      expect(webCourse.completionRate).toBe(50); // (1/2)*100 = 50%

      // Data Science has 2 skills: Pandas (earned), SQL (not_started)
      const dsCourse = res.body.courses.find((c) => c.name === 'Data Science');
      expect(dsCourse.totalSkills).toBe(2);
      expect(dsCourse.earnedSkills).toBe(1);
      expect(dsCourse.completionRate).toBe(50); // (1/2)*100 = 50%
    });

    it('14. Overall summary stats correct (totalSkills, earnedSkills, pendingSkills, overallCompletionRate)', async () => {
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const { summary } = res.body;

      expect(summary.totalSkills).toBe(4);
      expect(summary.earnedSkills).toBe(2);
      expect(summary.pendingSkills).toBe(1);
      expect(summary.overallCompletionRate).toBe(50); // (2/4)*100 = 50%
    });

    it('15. Student not enrolled in any course returns { courses: [], summary: { totalSkills: 0, ... } }', async () => {
      // student2 has no enrollments
      const res = await request(app)
        .get('/api/passport/my/skill-map')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.courses).toEqual([]);
      expect(res.body.summary).toEqual({
        totalSkills: 0,
        earnedSkills: 0,
        pendingSkills: 0,
        overallCompletionRate: 0,
      });
    });

    it('16. Unauthenticated request to /skill-map returns 401', async () => {
      const res = await request(app).get('/api/passport/my/skill-map');
      expect(res.status).toBe(401);
    });
  });
});
