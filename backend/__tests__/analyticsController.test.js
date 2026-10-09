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
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor1, instructor2, instructorNoCourses;
let student1, student2, student3;
let instructor1Token, instructor2Token, instructorNoCoursesToken, student1Token;
let course1, course2, course3;
let skill1, skill2, skill3, skill4, skill5, skillZero;
let cs1, cs2, cs3, cs4, cs5, csZero;

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '1d',
  });
};

// Helper to seed statuses with unique student IDs
const seedStatuses = async (courseSkillId, approved, rejected, pending, notStarted = 0) => {
  const records = [];
  for (let i = 0; i < approved; i++) {
    records.push({
      student_id: new mongoose.Types.ObjectId(),
      course_skill_id: courseSkillId,
      status: 'approved',
    });
  }
  for (let i = 0; i < rejected; i++) {
    records.push({
      student_id: new mongoose.Types.ObjectId(),
      course_skill_id: courseSkillId,
      status: 'rejected',
    });
  }
  for (let i = 0; i < pending; i++) {
    records.push({
      student_id: new mongoose.Types.ObjectId(),
      course_skill_id: courseSkillId,
      status: 'pending',
    });
  }
  for (let i = 0; i < notStarted; i++) {
    records.push({
      student_id: new mongoose.Types.ObjectId(),
      course_skill_id: courseSkillId,
      status: 'not_started',
    });
  }
  if (records.length > 0) {
    await StudentSkillStatus.insertMany(records);
  }
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

  // 1. Seed Users
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

  instructorNoCourses = await User.create({
    name: 'Dr. Brown',
    email: 'brown@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

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

  student3 = await User.create({
    name: 'Charlie',
    email: 'charlie@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor1Token = createToken(instructor1);
  instructor2Token = createToken(instructor2);
  instructorNoCoursesToken = createToken(instructorNoCourses);
  student1Token = createToken(student1);

  // 2. Seed Courses
  course1 = await Course.create({
    name: 'Web Development',
    description: 'Modern Web Stack',
    instructor_id: instructor1._id,
  });

  course2 = await Course.create({
    name: 'Data Science',
    description: 'Python and Data Analysis',
    instructor_id: instructor1._id,
  });

  course3 = await Course.create({
    name: 'Mobile Dev',
    description: 'Flutter and Native Apps',
    instructor_id: instructor2._id,
  });

  // 3. Seed MicroSkills
  skill1 = await MicroSkill.create({
    name: 'Express.js',
    description: 'REST APIs',
    criteria: 'Build API with Express',
  });

  skill2 = await MicroSkill.create({
    name: 'React',
    description: 'Frontend',
    criteria: 'Build SPA with React',
  });

  skill3 = await MicroSkill.create({
    name: 'Node.js Auth',
    description: 'Auth',
    criteria: 'Implement JWT authentication',
  });

  skill4 = await MicroSkill.create({
    name: 'Pandas',
    description: 'Data',
    criteria: 'Clean dataset with Pandas',
  });

  skill5 = await MicroSkill.create({
    name: 'SQL',
    description: 'Database',
    criteria: 'Write queries and joins',
  });

  skillZero = await MicroSkill.create({
    name: 'Docker Basics',
    description: 'Containers',
    criteria: 'Build and run containers',
  });

  // 4. Seed CourseSkill
  // course1 -> skill1, skill2, skill3
  cs1 = await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  cs2 = await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });
  cs3 = await CourseSkill.create({ course_id: course1._id, skill_id: skill3._id });

  // course2 -> skill4, skill5
  cs4 = await CourseSkill.create({ course_id: course2._id, skill_id: skill4._id });
  cs5 = await CourseSkill.create({ course_id: course2._id, skill_id: skill5._id });

  // 5. Seed StudentSkillStatus according to TON-91 specification:
  // course1/skill1: 5 approved, 2 rejected, 1 pending
  await seedStatuses(cs1._id, 5, 2, 1);

  // course1/skill2: 3 approved, 0 rejected, 2 pending
  await seedStatuses(cs2._id, 3, 0, 2);

  // course1/skill3: 0 approved, 1 rejected, 0 pending
  await seedStatuses(cs3._id, 0, 1, 0);

  // course2/skill4: 2 approved, 1 rejected, 0 pending
  await seedStatuses(cs4._id, 2, 1, 0);

  // course2/skill5: 1 approved, 0 rejected, 1 pending
  await seedStatuses(cs5._id, 1, 0, 1);
});

describe('Analytics Dashboard API (TON-91)', () => {
  describe('GET /api/v1/analytics/overview', () => {
    // 1. Instructor with courses and mixed data
    it('1. should return 200 with correct totalCourses, totalSkills, totalBadgesIssued, totalPendingRequests', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.overview).toBeDefined();
      expect(res.body.overview.totalCourses).toBe(2);
      expect(res.body.overview.totalSkills).toBe(5);
      expect(res.body.overview.totalBadgesIssued).toBe(11);
      expect(res.body.overview.totalPendingRequests).toBe(4);
      expect(res.body.overview.totalRejected).toBe(4);
    });

    // 2. approvalRate computed correctly: approved / (approved + rejected) * 100, rounded
    it('2. should compute approvalRate correctly (approved / (approved + rejected) * 100, rounded)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      // 11 / (11 + 4) * 100 = 73.333... -> 73.3
      expect(res.body.overview.approvalRate).toBe(73.3);
    });

    // 3. Filter by courseId
    it('3. should filter overview stats scoped to that course only when courseId is provided', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/overview?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.overview.totalCourses).toBe(1);
      expect(res.body.overview.totalSkills).toBe(3);
      // course1: skill1 (5A, 2R, 1P) + skill2 (3A, 0R, 2P) + skill3 (0A, 1R, 0P)
      // totalBadgesIssued: 5 + 3 + 0 = 8
      // totalPendingRequests: 1 + 2 + 0 = 3
      // totalRejected: 2 + 0 + 1 = 3
      expect(res.body.overview.totalBadgesIssued).toBe(8);
      expect(res.body.overview.totalPendingRequests).toBe(3);
      expect(res.body.overview.totalRejected).toBe(3);
      // 8 / (8 + 3) * 100 = 72.727... -> 72.7
      expect(res.body.overview.approvalRate).toBe(72.7);
    });

    // 4. Instructor with no courses
    it('4. should return 200 with all zeros for instructor with no courses', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${instructorNoCoursesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.overview).toEqual({
        totalCourses: 0,
        totalSkills: 0,
        totalBadgesIssued: 0,
        totalPendingRequests: 0,
        totalRejected: 0,
        approvalRate: 0,
      });
    });

    // 5. Only counts instructor's own courses
    it("5. should only count instructor's own courses and not see instructor2 data", async () => {
      // Query course3 which belongs to instructor2
      const res = await request(app)
        .get(`/api/v1/analytics/overview?courseId=${course3._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.overview).toEqual({
        totalCourses: 0,
        totalSkills: 0,
        totalBadgesIssued: 0,
        totalPendingRequests: 0,
        totalRejected: 0,
        approvalRate: 0,
      });
    });

    // 6. Unauthenticated request
    it('6. should return 401 for unauthenticated request to /analytics/overview', async () => {
      const res = await request(app).get('/api/v1/analytics/overview');
      expect(res.status).toBe(401);
    });

    // 7. Student tries to access
    it('7. should return 403 when a student tries to access /analytics/overview', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/skills', () => {
    // 8. Returns per-skill breakdown sorted by approved desc
    it('8. should return per-skill breakdown sorted by approved desc', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/skills?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toBeInstanceOf(Array);
      expect(res.body.skills.length).toBe(3);

      // skill1: 5 approved, skill2: 3 approved, skill3: 0 approved
      expect(res.body.skills[0].skill.name).toBe('Express.js');
      expect(res.body.skills[0].approved).toBe(5);

      expect(res.body.skills[1].skill.name).toBe('React');
      expect(res.body.skills[1].approved).toBe(3);

      expect(res.body.skills[2].skill.name).toBe('Node.js Auth');
      expect(res.body.skills[2].approved).toBe(0);
    });

    // 9. Each skill has correct approved/rejected/pending/notStarted counts
    it('9. should have correct approved/rejected/pending/notStarted counts matching seed data exactly', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/skills?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);

      const skill1Data = res.body.skills.find(
        (s) => s.skill.name === 'Express.js'
      );
      expect(skill1Data).toBeDefined();
      expect(skill1Data.approved).toBe(5);
      expect(skill1Data.rejected).toBe(2);
      expect(skill1Data.pending).toBe(1);
      expect(skill1Data.notStarted).toBe(0);
      expect(skill1Data.total).toBe(8);

      const skill2Data = res.body.skills.find((s) => s.skill.name === 'React');
      expect(skill2Data).toBeDefined();
      expect(skill2Data.approved).toBe(3);
      expect(skill2Data.rejected).toBe(0);
      expect(skill2Data.pending).toBe(2);
      expect(skill2Data.notStarted).toBe(0);
      expect(skill2Data.total).toBe(5);

      const skill3Data = res.body.skills.find(
        (s) => s.skill.name === 'Node.js Auth'
      );
      expect(skill3Data).toBeDefined();
      expect(skill3Data.approved).toBe(0);
      expect(skill3Data.rejected).toBe(1);
      expect(skill3Data.pending).toBe(0);
      expect(skill3Data.notStarted).toBe(0);
      expect(skill3Data.total).toBe(1);
    });

    // 10. approvalRate and rejectionRate computed correctly
    it('10. should compute approvalRate and rejectionRate correctly (skill1: 71.4%, 28.6%)', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/skills?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const skill1Data = res.body.skills.find(
        (s) => s.skill.name === 'Express.js'
      );
      // 5 / (5 + 2) * 100 = 71.4%
      expect(skill1Data.approvalRate).toBe(71.4);
      // 2 / (5 + 2) * 100 = 28.6%
      expect(skill1Data.rejectionRate).toBe(28.6);
    });

    // 11. Division by zero handled (0 approved + 0 rejected)
    it('11. should handle division by zero (0 approved + 0 rejected) with approvalRate = 0, rejectionRate = 0', async () => {
      // Add a skill to course1 with 0 approved and 0 rejected (only 1 pending)
      csZero = await CourseSkill.create({
        course_id: course1._id,
        skill_id: skillZero._id,
      });
      await seedStatuses(csZero._id, 0, 0, 1);

      const res = await request(app)
        .get(`/api/v1/analytics/skills?courseId=${course1._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      const skillZeroData = res.body.skills.find(
        (s) => s.skill.name === 'Docker Basics'
      );
      expect(skillZeroData).toBeDefined();
      expect(skillZeroData.approved).toBe(0);
      expect(skillZeroData.rejected).toBe(0);
      expect(skillZeroData.pending).toBe(1);
      expect(skillZeroData.approvalRate).toBe(0);
      expect(skillZeroData.rejectionRate).toBe(0);
    });

    // 12. Filter by courseId
    it('12. should return only skills for that course when filtered by courseId', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/skills?courseId=${course2._id}`)
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.skills.length).toBe(2);
      const skillNames = res.body.skills.map((s) => s.skill.name);
      expect(skillNames).toContain('Pandas');
      expect(skillNames).toContain('SQL');
      expect(skillNames).not.toContain('Express.js');
    });

    // 13. Response includes filter courses list
    it("13. should include filters.courses list containing instructor's courses", async () => {
      const res = await request(app)
        .get('/api/v1/analytics/skills')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.filters).toBeDefined();
      expect(res.body.filters.courses).toBeInstanceOf(Array);
      expect(res.body.filters.courses.length).toBe(2);

      const courseNames = res.body.filters.courses.map((c) => c.name);
      expect(courseNames).toContain('Web Development');
      expect(courseNames).toContain('Data Science');
    });

    // 14. Only shows instructor's own courses' skills
    it("14. should only show instructor's own courses' skills and not instructor2 data", async () => {
      const res = await request(app)
        .get('/api/v1/analytics/skills')
        .set('Authorization', `Bearer ${instructor1Token}`);

      expect(res.status).toBe(200);
      // All returned courses must be owned by instructor1
      for (const item of res.body.skills) {
        expect(item.course.name).not.toBe('Mobile Dev');
      }

      const filterCourseNames = res.body.filters.courses.map((c) => c.name);
      expect(filterCourseNames).not.toContain('Mobile Dev');
    });

    // 15. Unauthenticated request
    it('15. should return 401 for unauthenticated request to /analytics/skills', async () => {
      const res = await request(app).get('/api/v1/analytics/skills');
      expect(res.status).toBe(401);
    });
  });
});
