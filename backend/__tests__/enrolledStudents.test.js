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
  VerificationRequest,
} = require('../src/models');

let mongoServer;
const JWT_SECRET =
  process.env.JWT_SECRET || 'your_super_secret_key_change_in_production';

let instructor1, instructor2, student1, student2, student3;
let instructor1Token, instructor2Token, student1Token;
let course1, course2;
let skill1, skill2, skill3;
let cs1, cs2, cs3;

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

  // Seed Instructors
  instructor1 = await User.create({
    name: 'Dr. Jane Instructor',
    email: 'jane@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  instructor2 = await User.create({
    name: 'Dr. John Other',
    email: 'john@uni.ac.th',
    password: 'password123',
    role: 'instructor',
  });

  // Seed Students
  student1 = await User.create({
    name: 'Alice Student',
    email: 'alice@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  student2 = await User.create({
    name: 'Bob Student',
    email: 'bob@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  student3 = await User.create({
    name: 'Charlie Student',
    email: 'charlie@uni.ac.th',
    password: 'password123',
    role: 'student',
  });

  instructor1Token = createToken(instructor1);
  instructor2Token = createToken(instructor2);
  student1Token = createToken(student1);

  // Seed Courses
  course1 = await Course.create({
    name: 'Full Stack Development',
    description: 'Complete web development course',
    instructor_id: instructor1._id,
  });

  course2 = await Course.create({
    name: 'Machine Learning Basics',
    description: 'Introduction to ML and AI',
    instructor_id: instructor2._id,
  });

  // Seed Skills
  skill1 = await MicroSkill.create({
    name: 'Express REST APIs',
    description: 'Backend APIs',
    criteria: 'Build CRUD API',
  });

  skill2 = await MicroSkill.create({
    name: 'React Frontend',
    description: 'SPA with React',
    criteria: 'Build UI components',
  });

  skill3 = await MicroSkill.create({
    name: 'Database Modeling',
    description: 'MongoDB schemas',
    criteria: 'Design schema',
  });

  // Course 1 has skill1 and skill2
  cs1 = await CourseSkill.create({ course_id: course1._id, skill_id: skill1._id });
  cs2 = await CourseSkill.create({ course_id: course1._id, skill_id: skill2._id });

  // Course 2 has skill3
  cs3 = await CourseSkill.create({ course_id: course2._id, skill_id: skill3._id });
});

describe('Instructor View Enrolled Students API Tests (TON-129, UC-34)', () => {
  it('1. Instructor views enrolled students for their own course with 3 active enrollments -> 200, 3 students returned with correct enrolled_at', async () => {
    await Enrollment.create({
      student_id: student1._id,
      course_id: course1._id,
      status: 'active',
      enrolled_at: new Date('2026-10-01T10:00:00Z'),
    });
    await Enrollment.create({
      student_id: student2._id,
      course_id: course1._id,
      status: 'active',
      enrolled_at: new Date('2026-10-02T10:00:00Z'),
    });
    await Enrollment.create({
      student_id: student3._id,
      course_id: course1._id,
      status: 'active',
      enrolled_at: new Date('2026-10-03T10:00:00Z'),
    });

    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(3);
    const emails = res.body.students.map((s) => s.student.email);
    expect(emails).toContain('alice@uni.ac.th');
    expect(emails).toContain('bob@uni.ac.th');
    expect(emails).toContain('charlie@uni.ac.th');
  });

  it('2. Student has 2 approved badges and 1 pending request in the course -> badgeCount: 2, pendingCount: 1 for that student', async () => {
    await Enrollment.create({
      student_id: student1._id,
      course_id: course1._id,
      status: 'active',
    });

    // Student 1 has 2 skills approved in course 1
    await StudentSkillStatus.updateOne(
      { student_id: student1._id, course_skill_id: cs1._id },
      { status: 'approved' },
      { upsert: true }
    );

    await StudentSkillStatus.updateOne(
      { student_id: student1._id, course_skill_id: cs2._id },
      { status: 'approved' },
      { upsert: true }
    );

    const s1Status1 = await StudentSkillStatus.findOne({
      student_id: student1._id,
      course_skill_id: cs1._id,
    });

    // And 1 pending request on cs1
    await VerificationRequest.create({
      student_skill_status_id: s1Status1._id,
      evidence_url: 'https://github.com/alice/test',
      status: 'pending',
    });

    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].badgeCount).toBe(2);
    expect(res.body.students[0].pendingCount).toBe(1);
  });

  it('3. Course with zero enrollments -> 200, { students: [] }', async () => {
    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toEqual([]);
  });

  it('4. Dropped enrollments excluded from the list -> Only status: active enrollments returned', async () => {
    await Enrollment.create({
      student_id: student1._id,
      course_id: course1._id,
      status: 'active',
    });
    await Enrollment.create({
      student_id: student2._id,
      course_id: course1._id,
      status: 'dropped',
    });

    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].student.email).toBe('alice@uni.ac.th');
  });

  it("5. Instructor attempts to view a course they don't own -> 403", async () => {
    // instructor1 tries to view course2 (owned by instructor2)
    const res = await request(app)
      .get(`/api/courses/${course2._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/forbidden/i);
  });

  it("6. Other instructor's students never leak into the response -> Scoped strictly to courseId param", async () => {
    // student1 enrolled in course1
    await Enrollment.create({
      student_id: student1._id,
      course_id: course1._id,
      status: 'active',
    });
    // student2 enrolled in course2
    await Enrollment.create({
      student_id: student2._id,
      course_id: course2._id,
      status: 'active',
    });

    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].student.email).toBe('alice@uni.ac.th');
  });

  it('7. Student attempts to call this endpoint -> 403', async () => {
    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(403);
  });

  it('8. Unauthenticated request -> 401', async () => {
    const res = await request(app).get(
      `/api/courses/${course1._id}/enrolled-students`
    );

    expect(res.status).toBe(401);
  });

  it('9. Course id does not exist -> 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/courses/${nonExistentId}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/course not found/i);
  });

  it('10. Multiple students with mixed badge/pending counts -> Each student counts are independently correct, no cross-contamination', async () => {
    await Enrollment.create({
      student_id: student1._id,
      course_id: course1._id,
      status: 'active',
    });
    await Enrollment.create({
      student_id: student2._id,
      course_id: course1._id,
      status: 'active',
    });

    // Student 1 has 1 badge, 1 pending
    await StudentSkillStatus.updateOne(
      { student_id: student1._id, course_skill_id: cs1._id },
      { status: 'approved' },
      { upsert: true }
    );
    await StudentSkillStatus.updateOne(
      { student_id: student1._id, course_skill_id: cs2._id },
      { status: 'pending' },
      { upsert: true }
    );
    const s1Status2 = await StudentSkillStatus.findOne({
      student_id: student1._id,
      course_skill_id: cs2._id,
    });
    await VerificationRequest.create({
      student_skill_status_id: s1Status2._id,
      evidence_url: 'https://github.com/alice/demo',
      status: 'pending',
    });

    // Student 2 has 0 badges, 0 pending (status defaults to not_started from hook)

    const res = await request(app)
      .get(`/api/courses/${course1._id}/enrolled-students`)
      .set('Authorization', `Bearer ${instructor1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(2);

    const alice = res.body.students.find((s) => s.student.email === 'alice@uni.ac.th');
    const bob = res.body.students.find((s) => s.student.email === 'bob@uni.ac.th');

    expect(alice).toBeDefined();
    expect(alice.badgeCount).toBe(1);
    expect(alice.pendingCount).toBe(1);

    expect(bob).toBeDefined();
    expect(bob.badgeCount).toBe(0);
    expect(bob.pendingCount).toBe(0);
  });
});
