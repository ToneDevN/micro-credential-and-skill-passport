const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const {
  User,
  Course,
  MicroSkill,
  CourseSkill,
  StudentSkillStatus,
  VerificationRequest,
  Badge,
  StudentPassport,
  CourseFollow,
  Notification,
} = require('../models');

// ─── Demo Seed v2 — Full Scenarios for Presentation ─────────────────────────
//
//  Users:
//    instructor@test.com  / password123  → Dr. Jane Smith
//    student1@test.com    / password123  → Alice Johnson  (Advanced: 4 badges)
//    student2@test.com    / password123  → Bob Williams   (Regular: 1 badge)
//    student3@test.com    / password123  → Charlie Brown  (New: 0 badges, 1 pending)
//
//  Courses (3):
//    Web Development     → 3 skills  (REST API: open, MongoDB: open, React: closed)
//    Database Design     → 3 skills  (DB Schema: open, SQL vs NoSQL: open, Query Opt: closed)
//    API Security        → 2 skills  (JWT Auth: open, OAuth2: open)
//
//  Instructor Review Queue (4 pending):
//    Alice   → SQL vs NoSQL Trade-offs   (3 hrs ago)
//    Bob     → MongoDB Aggregation       (5 hrs ago)
//    Bob     → JWT Authentication        (1 hr ago)
//    Charlie → Build REST API            (30 mins ago)
//
//  Badges issued:
//    Alice: REST API, MongoDB, DB Schema, JWT Auth  (4 badges)
//    Bob:   REST API                                (1 badge)
//
//  Notifications:
//    Alice: 5 (4 approved: read, 1 rejected: read, 1 approved: UNREAD)
//    Bob:   1 (approved: read)
//
// ─────────────────────────────────────────────────────────────────────────────

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000);

const seedDatabase = async () => {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/skill_passport';

  try {
    console.log(`[Seed] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected successfully.');

    // ── 1. Clear collections ──────────────────────────────────────────────────
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      MicroSkill.deleteMany({}),
      CourseSkill.deleteMany({}),
      StudentSkillStatus.deleteMany({}),
      VerificationRequest.deleteMany({}),
      Badge.deleteMany({}),
      StudentPassport.deleteMany({}),
      CourseFollow.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('[Seed] All collections cleared.\n');

    // ── 2. Users ──────────────────────────────────────────────────────────────
    console.log('[Seed] Creating users...');
    const instructor = await User.create({
      name: 'Dr. Jane Smith',
      email: 'instructor@test.com',
      password: 'password123',
      role: 'instructor',
    });
    const alice = await User.create({
      name: 'Alice Johnson',
      email: 'student1@test.com',
      password: 'password123',
      role: 'student',
    });
    const bob = await User.create({
      name: 'Bob Williams',
      email: 'student2@test.com',
      password: 'password123',
      role: 'student',
    });
    const charlie = await User.create({
      name: 'Charlie Brown',
      email: 'student3@test.com',
      password: 'password123',
      role: 'student',
    });
    console.log('[Seed] Created 1 instructor + 3 students.');

    // ── 3. Courses ────────────────────────────────────────────────────────────
    console.log('[Seed] Creating courses...');
    const webDevCourse = await Course.create({
      name: 'Web Development',
      description:
        'Full-stack web development with Node.js and React — covers REST API design, MongoDB modeling, and UI component patterns.',
      instructor_id: instructor._id,
    });
    const dbDesignCourse = await Course.create({
      name: 'Database Design',
      description:
        'Relational and NoSQL database modeling, aggregation pipelines, indexing strategies, and query optimization techniques.',
      instructor_id: instructor._id,
    });
    const apiSecCourse = await Course.create({
      name: 'API Security',
      description:
        'Secure API design patterns including JWT authentication, OAuth2 authorization, rate limiting, and OWASP API Top 10.',
      instructor_id: instructor._id,
    });
    console.log('[Seed] Created 3 courses: Web Development, Database Design, API Security.');

    // ── 4. MicroSkills ────────────────────────────────────────────────────────
    console.log('[Seed] Creating micro-skills...');

    // --- Web Development ---
    const skillApi = await MicroSkill.create({
      name: 'Build REST API with Express',
      description:
        'Design and implement RESTful endpoints with input validation, error handling, and JWT authentication middleware.',
      criteria:
        'Submit a GitHub repository containing complete CRUD endpoints, middleware, and at least 5 integration tests.',
      is_open_for_verification: true,
    });
    const skillMongo = await MicroSkill.create({
      name: 'MongoDB Aggregation Pipeline',
      description:
        'Construct multi-stage aggregation queries using $match, $group, $lookup, $project, and $unwind.',
      criteria:
        'Provide a GitHub repository with aggregation queries solving a multi-collection reporting problem, including an explain plan screenshot.',
      is_open_for_verification: true,
    });
    const skillReact = await MicroSkill.create({
      name: 'React Component Design',
      description:
        'Build modular, accessible UI components using hooks, context API, and compound component patterns.',
      criteria:
        'Deliver a responsive frontend application with at least 3 reusable components and snapshot tests passing.',
      is_open_for_verification: false, // CLOSED — tests 403 guard
    });

    // --- Database Design ---
    const skillDbSchema = await MicroSkill.create({
      name: 'MongoDB Schema Design',
      description:
        'Design MongoDB schemas using embedding vs. referencing patterns, schema validation, and index strategies.',
      criteria:
        'Submit a GitHub repository with a documented schema design including rationale for embedding/referencing decisions.',
      is_open_for_verification: true,
    });
    const skillSqlVsNoSql = await MicroSkill.create({
      name: 'SQL vs NoSQL Trade-offs',
      description:
        'Analyze trade-offs between relational and document-oriented databases for different use-case scenarios.',
      criteria:
        'Provide a written analysis (in GitHub README) comparing 3 real use cases with justification for database choice.',
      is_open_for_verification: true,
    });
    const skillQueryOpt = await MicroSkill.create({
      name: 'Query Optimization & Indexing',
      description:
        'Optimize MongoDB queries using explain plans, compound indexes, and covered queries to meet performance targets.',
      criteria:
        'Demonstrate a before/after benchmark with at least 50% query time improvement using proper indexing.',
      is_open_for_verification: false, // CLOSED
    });

    // --- API Security ---
    const skillJwt = await MicroSkill.create({
      name: 'JWT Authentication',
      description:
        'Implement stateless JWT authentication with access tokens, refresh tokens, and role-based access control.',
      criteria:
        'Provide a GitHub repository with JWT auth middleware, protected routes, and a test suite covering valid/invalid/expired tokens.',
      is_open_for_verification: true,
    });
    const skillOauth = await MicroSkill.create({
      name: 'OAuth2 Integration',
      description:
        'Integrate OAuth2 Authorization Code flow with a third-party provider (e.g., GitHub, Google) into a web application.',
      criteria:
        'Submit working OAuth2 integration with token storage, refresh logic, and error handling for revoked tokens.',
      is_open_for_verification: true,
    });

    // ── Additional Skills (explore page — no verifications yet) ───────────────

    // --- Web Development extras ---
    const skillTypeScript = await MicroSkill.create({
      name: 'TypeScript Fundamentals',
      description:
        'Apply TypeScript static typing to a Node.js project — interfaces, generics, union types, and strict mode configuration.',
      criteria:
        'Submit a TypeScript project with at least 10 typed interfaces/types, zero `any` usages, and tsconfig.json in strict mode.',
      is_open_for_verification: true,
    });
    const skillDocker = await MicroSkill.create({
      name: 'Docker & Containerization',
      description:
        'Containerize a full-stack application using Docker and Docker Compose with proper networking and volume management.',
      criteria:
        'Provide a GitHub repository with Dockerfile, docker-compose.yml, and a README explaining how to run the stack locally.',
      is_open_for_verification: true,
    });
    const skillCiCd = await MicroSkill.create({
      name: 'CI/CD with GitHub Actions',
      description:
        'Automate testing, linting, and deployment using GitHub Actions workflows with environment secrets management.',
      criteria:
        'Submit a repository with at least 2 GitHub Actions workflows (test + deploy) and evidence of successful pipeline runs.',
      is_open_for_verification: true,
    });
    const skillTesting = await MicroSkill.create({
      name: 'API Integration Testing',
      description:
        'Write comprehensive integration tests for REST APIs using Jest and Supertest covering happy paths, edge cases, and error flows.',
      criteria:
        'Provide test suite with minimum 80% code coverage report, covering at least 3 different HTTP methods and status codes.',
      is_open_for_verification: true,
    });

    // --- Database Design extras ---
    const skillRedis = await MicroSkill.create({
      name: 'Redis Caching Strategies',
      description:
        'Implement caching layers using Redis with TTL management, cache invalidation patterns, and cache-aside vs write-through strategies.',
      criteria:
        'Submit a Node.js project demonstrating Redis caching with benchmarks showing at least 3x latency improvement on repeated queries.',
      is_open_for_verification: true,
    });
    const skillMigration = await MicroSkill.create({
      name: 'Database Migration & Versioning',
      description:
        'Manage schema evolution using migration scripts with rollback support, zero-downtime strategies, and version tracking.',
      criteria:
        'Provide a migration system with at least 5 versioned scripts, rollback capability, and documentation of zero-downtime approach.',
      is_open_for_verification: true,
    });
    const skillDataModeling = await MicroSkill.create({
      name: 'Data Modeling Best Practices',
      description:
        'Design normalized relational schemas and denormalized document models, choosing the right pattern for access patterns and scale.',
      criteria:
        'Submit an ERD or schema design document with justification for modeling decisions, including trade-off analysis for 3 access patterns.',
      is_open_for_verification: false, // CLOSED
    });

    // --- API Security extras ---
    const skillRateLimit = await MicroSkill.create({
      name: 'Rate Limiting & Throttling',
      description:
        'Implement API rate limiting using sliding window and token bucket algorithms to prevent abuse and ensure fair usage.',
      criteria:
        'Provide a Node.js API with rate limiting middleware, configurable limits per user/IP, and proper 429 responses with Retry-After headers.',
      is_open_for_verification: true,
    });
    const skillCors = await MicroSkill.create({
      name: 'CORS & Security Headers',
      description:
        'Configure CORS policies, HTTP security headers (CSP, HSTS, X-Frame-Options), and API gateway security rules.',
      criteria:
        'Submit an Express.js app with helmet.js integration, strict CORS whitelist, and a security audit report showing passing scores.',
      is_open_for_verification: true,
    });
    const skillInputVal = await MicroSkill.create({
      name: 'Input Validation & Sanitization',
      description:
        'Implement server-side input validation and sanitization to prevent injection attacks, XSS, and malformed data processing.',
      criteria:
        'Provide a validated API with Zod or Joi schemas on all endpoints, with tests demonstrating rejection of invalid/malicious payloads.',
      is_open_for_verification: true,
    });

    console.log('[Seed] Created 19 micro-skills total (8 original + 11 new explore skills).');

    // ── 5. CourseSkill junction ───────────────────────────────────────────────
    console.log('[Seed] Linking skills to courses...');
    const csWebApi      = await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillApi._id });
    const csWebMongo    = await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillMongo._id });
    const csWebReact    = await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillReact._id });
    const csDbSchema    = await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillDbSchema._id });
    const csDbSqlNoSql  = await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillSqlVsNoSql._id });
    const csDbQueryOpt  = await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillQueryOpt._id });
    const csApiJwt      = await CourseSkill.create({ course_id: apiSecCourse._id,   skill_id: skillJwt._id });
    const csApiOauth    = await CourseSkill.create({ course_id: apiSecCourse._id,   skill_id: skillOauth._id });

    // Additional skills linked to courses
    await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillTypeScript._id });
    await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillDocker._id });
    await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillCiCd._id });
    await CourseSkill.create({ course_id: webDevCourse._id,   skill_id: skillTesting._id });
    await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillRedis._id });
    await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillMigration._id });
    await CourseSkill.create({ course_id: dbDesignCourse._id, skill_id: skillDataModeling._id });
    await CourseSkill.create({ course_id: apiSecCourse._id,   skill_id: skillRateLimit._id });
    await CourseSkill.create({ course_id: apiSecCourse._id,   skill_id: skillCors._id });
    await CourseSkill.create({ course_id: apiSecCourse._id,   skill_id: skillInputVal._id });

    console.log('[Seed] Linked: WebDev(7), DatabaseDesign(6), APISecurity(5) = 18 total course-skills.');

    // ── 6. StudentSkillStatus ─────────────────────────────────────────────────
    console.log('[Seed] Creating StudentSkillStatus records...');

    // Alice — Advanced Student (4 approved, 1 pending, 1 rejected)
    const ssAliceWebApi     = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csWebApi._id,     status: 'approved' });
    const ssAliceWebMongo   = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csWebMongo._id,   status: 'approved' });
    const ssAliceWebReact   = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csWebReact._id,   status: 'rejected' });
    const ssAliceDbSchema   = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csDbSchema._id,   status: 'approved' });
    const ssAliceDbSqlNoSql = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csDbSqlNoSql._id, status: 'pending' });
    const ssAliceApiJwt     = await StudentSkillStatus.create({ student_id: alice._id, course_skill_id: csApiJwt._id,     status: 'approved' });

    // Bob — Regular Student (1 approved, 2 pending)
    const ssBobWebApi   = await StudentSkillStatus.create({ student_id: bob._id, course_skill_id: csWebApi._id,  status: 'approved' });
    const ssBobWebMongo = await StudentSkillStatus.create({ student_id: bob._id, course_skill_id: csWebMongo._id, status: 'pending' });
    const ssBobApiJwt   = await StudentSkillStatus.create({ student_id: bob._id, course_skill_id: csApiJwt._id,  status: 'pending' });

    // Charlie — New Student (1 pending)
    const ssCharlieWebApi = await StudentSkillStatus.create({ student_id: charlie._id, course_skill_id: csWebApi._id, status: 'pending' });

    console.log('[Seed] Statuses — Alice: 4 approved + 1 pending + 1 rejected, Bob: 1 approved + 2 pending, Charlie: 1 pending.');

    // ── 7. VerificationRequests ───────────────────────────────────────────────
    console.log('[Seed] Creating verification requests...');

    // Alice — REST API: approved
    await VerificationRequest.create({
      student_skill_status_id: ssAliceWebApi._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/alice-johnson/express-rest-api',
      status: 'approved',
      submitted_at: daysAgo(14),
      reviewed_at: daysAgo(13),
    });

    // Alice — MongoDB: approved
    await VerificationRequest.create({
      student_skill_status_id: ssAliceWebMongo._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/alice-johnson/mongodb-aggregation',
      status: 'approved',
      submitted_at: daysAgo(10),
      reviewed_at: daysAgo(9),
    });

    // Alice — React: rejected (skill is CLOSED → cannot resubmit)
    await VerificationRequest.create({
      student_skill_status_id: ssAliceWebReact._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/alice-johnson/react-components',
      status: 'rejected',
      feedback:
        'The components lack accessibility attributes (aria-label, role). Please add keyboard navigation support and resubmit when the skill reopens.',
      submitted_at: daysAgo(7),
      reviewed_at: daysAgo(6),
    });

    // Alice — DB Schema: approved
    await VerificationRequest.create({
      student_skill_status_id: ssAliceDbSchema._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/alice-johnson/mongodb-schema-design',
      status: 'approved',
      submitted_at: daysAgo(5),
      reviewed_at: daysAgo(4),
    });

    // Alice — SQL vs NoSQL: PENDING (in review queue — 3 hrs ago)
    const reqAliceSqlNoSql = await VerificationRequest.create({
      student_skill_status_id: ssAliceDbSqlNoSql._id,
      evidence_url: 'https://github.com/alice-johnson/sql-vs-nosql-analysis',
      status: 'pending',
      submitted_at: hoursAgo(3),
    });

    // Alice — JWT Auth: approved
    await VerificationRequest.create({
      student_skill_status_id: ssAliceApiJwt._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/alice-johnson/jwt-auth-system',
      status: 'approved',
      submitted_at: daysAgo(3),
      reviewed_at: daysAgo(2),
    });

    // Bob — REST API: approved
    await VerificationRequest.create({
      student_skill_status_id: ssBobWebApi._id,
      reviewed_by: instructor._id,
      evidence_url: 'https://github.com/bob-williams/my-rest-api',
      status: 'approved',
      submitted_at: daysAgo(8),
      reviewed_at: daysAgo(7),
    });

    // Bob — MongoDB: PENDING (in review queue — 5 hrs ago)
    const reqBobMongoPipe = await VerificationRequest.create({
      student_skill_status_id: ssBobWebMongo._id,
      evidence_url: 'https://github.com/bob-williams/mongo-pipeline-practice',
      status: 'pending',
      submitted_at: hoursAgo(5),
    });

    // Bob — JWT Auth: PENDING (in review queue — 1 hr ago)
    const reqBobJwt = await VerificationRequest.create({
      student_skill_status_id: ssBobApiJwt._id,
      evidence_url: 'https://github.com/bob-williams/secure-api-jwt',
      status: 'pending',
      submitted_at: hoursAgo(1),
    });

    // Charlie — REST API: PENDING (in review queue — 30 mins ago)
    const reqCharlieWebApi = await VerificationRequest.create({
      student_skill_status_id: ssCharlieWebApi._id,
      evidence_url: 'https://github.com/charlie-b/first-express-api',
      status: 'pending',
      submitted_at: minutesAgo(30),
    });

    console.log('[Seed] Created 10 requests: 4 pending (in queue), 5 approved, 1 rejected.');

    // ── 8. Badges + StudentPassports ──────────────────────────────────────────
    console.log('[Seed] Creating badges and passports...');

    // Alice — 4 badges
    const aliceBadge1 = { student_id: alice._id, skill_id: skillApi._id,      student_skill_status_id: ssAliceWebApi._id,     skill_name: 'Build REST API with Express',  course_name: 'Web Development',  issued_at: daysAgo(13) };
    const aliceBadge2 = { student_id: alice._id, skill_id: skillMongo._id,    student_skill_status_id: ssAliceWebMongo._id,   skill_name: 'MongoDB Aggregation Pipeline', course_name: 'Web Development',  issued_at: daysAgo(9) };
    const aliceBadge3 = { student_id: alice._id, skill_id: skillDbSchema._id, student_skill_status_id: ssAliceDbSchema._id,   skill_name: 'MongoDB Schema Design',        course_name: 'Database Design',  issued_at: daysAgo(4) };
    const aliceBadge4 = { student_id: alice._id, skill_id: skillJwt._id,      student_skill_status_id: ssAliceApiJwt._id,     skill_name: 'JWT Authentication',           course_name: 'API Security',     issued_at: daysAgo(2) };

    // Bob — 1 badge
    const bobBadge1 = { student_id: bob._id, skill_id: skillApi._id, student_skill_status_id: ssBobWebApi._id, skill_name: 'Build REST API with Express', course_name: 'Web Development', issued_at: daysAgo(7) };

    await Promise.all([
      Badge.create(aliceBadge1),
      Badge.create(aliceBadge2),
      Badge.create(aliceBadge3),
      Badge.create(aliceBadge4),
      Badge.create(bobBadge1),
    ]);

    await StudentPassport.create({
      student_id: alice._id,
      badges: [aliceBadge1, aliceBadge2, aliceBadge3, aliceBadge4],
    });
    await StudentPassport.create({
      student_id: bob._id,
      badges: [bobBadge1],
    });
    await StudentPassport.create({
      student_id: charlie._id,
      badges: [],
    });

    console.log('[Seed] Passports — Alice: 4 badges, Bob: 1 badge, Charlie: 0 badges.');

    // ── 9. CourseFollow ───────────────────────────────────────────────────────
    console.log('[Seed] Creating course follows...');

    // Alice follows all 3 courses
    await CourseFollow.create({ student_id: alice._id, course_id: webDevCourse._id,   followed_at: daysAgo(20) });
    await CourseFollow.create({ student_id: alice._id, course_id: dbDesignCourse._id, followed_at: daysAgo(15) });
    await CourseFollow.create({ student_id: alice._id, course_id: apiSecCourse._id,   followed_at: daysAgo(5) });

    // Bob follows 2 courses
    await CourseFollow.create({ student_id: bob._id, course_id: webDevCourse._id,  followed_at: daysAgo(10) });
    await CourseFollow.create({ student_id: bob._id, course_id: apiSecCourse._id,  followed_at: daysAgo(2) });

    // Charlie follows 1 course
    await CourseFollow.create({ student_id: charlie._id, course_id: webDevCourse._id, followed_at: daysAgo(1) });

    console.log('[Seed] Course follows — Alice: 3, Bob: 2, Charlie: 1.');

    // ── 10. Notifications ─────────────────────────────────────────────────────
    console.log('[Seed] Creating notifications...');

    // Alice — 6 notifications (5 read, 1 unread = JWT approval)
    await Notification.create({ user_id: alice._id, type: 'badge_approved', message: 'ทักษะ "Build REST API with Express" ใน Web Development ได้รับการอนุมัติแล้ว! 🎉',      related_id: ssAliceWebApi._id,     is_read: true,  created_at: daysAgo(13) });
    await Notification.create({ user_id: alice._id, type: 'badge_approved', message: 'ทักษะ "MongoDB Aggregation Pipeline" ใน Web Development ได้รับการอนุมัติแล้ว! 🎉',    related_id: ssAliceWebMongo._id,   is_read: true,  created_at: daysAgo(9) });
    await Notification.create({ user_id: alice._id, type: 'badge_rejected', message: 'ทักษะ "React Component Design" ถูกปฏิเสธ — โปรดอ่าน feedback จากอาจารย์',             related_id: ssAliceWebReact._id,   is_read: true,  created_at: daysAgo(6) });
    await Notification.create({ user_id: alice._id, type: 'badge_approved', message: 'ทักษะ "MongoDB Schema Design" ใน Database Design ได้รับการอนุมัติแล้ว! 🎉',           related_id: ssAliceDbSchema._id,   is_read: true,  created_at: daysAgo(4) });
    await Notification.create({ user_id: alice._id, type: 'badge_approved', message: 'ทักษะ "JWT Authentication" ใน API Security ได้รับการอนุมัติแล้ว! 🎉',                  related_id: ssAliceApiJwt._id,     is_read: false, created_at: daysAgo(2) }); // UNREAD

    // Bob — 1 notification (read)
    await Notification.create({ user_id: bob._id, type: 'badge_approved', message: 'ทักษะ "Build REST API with Express" ใน Web Development ได้รับการอนุมัติแล้ว! 🎉', related_id: ssBobWebApi._id, is_read: true, created_at: daysAgo(7) });

    // Instructor — 4 notifications for pending review queue requests (2 unread, 2 read)
    await Notification.create({ user_id: instructor._id, type: 'new_verification_request', message: 'Alice Johnson ได้ส่งคำขอตรวจประเมินทักษะ "SQL vs NoSQL Analysis" ใน Database Design', related_id: reqAliceSqlNoSql._id, is_read: false, created_at: hoursAgo(3) });
    await Notification.create({ user_id: instructor._id, type: 'new_verification_request', message: 'Bob Williams ได้ส่งคำขอตรวจประเมินทักษะ "MongoDB Aggregation Pipeline" ใน Web Development', related_id: reqBobMongoPipe._id, is_read: false, created_at: hoursAgo(5) });
    await Notification.create({ user_id: instructor._id, type: 'new_verification_request', message: 'Bob Williams ได้ส่งคำขอตรวจประเมินทักษะ "JWT Authentication" ใน API Security', related_id: reqBobJwt._id, is_read: true, created_at: hoursAgo(1) });
    await Notification.create({ user_id: instructor._id, type: 'new_verification_request', message: 'Charlie Brown ได้ส่งคำขอตรวจประเมินทักษะ "Build REST API with Express" ใน Web Development', related_id: reqCharlieWebApi._id, is_read: true, created_at: minutesAgo(30) });

    console.log('[Seed] Notifications — Alice: 5 (1 unread), Bob: 1 (read), Instructor: 4 (2 unread).');

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║            DEMO SEED COMPLETE (v2)                  ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Test Accounts:');
    console.log('  instructor@test.com  / password123  → Dr. Jane Smith');
    console.log('  student1@test.com    / password123  → Alice Johnson  (Advanced)');
    console.log('  student2@test.com    / password123  → Bob Williams   (Regular)');
    console.log('  student3@test.com    / password123  → Charlie Brown  (New)');
    console.log('');
    console.log('Courses & Skills (19 total):');
    console.log('  Web Development  (7) → REST API | MongoDB | React(CLOSED) | TypeScript | Docker | CI/CD | Integration Testing');
    console.log('  Database Design  (6) → DB Schema | SQL vs NoSQL | Query Opt(CLOSED) | Redis | Migration | Data Modeling(CLOSED)');
    console.log('  API Security     (5) → JWT Auth | OAuth2 | Rate Limiting | CORS Headers | Input Validation');
    console.log('');
    console.log('Instructor Review Queue (4 pending):');
    console.log('  Alice   → SQL vs NoSQL Trade-offs   (3 hrs ago)');
    console.log('  Bob     → MongoDB Aggregation        (5 hrs ago)');
    console.log('  Bob     → JWT Authentication         (1 hr ago)');
    console.log('  Charlie → Build REST API             (30 mins ago)');
    console.log('');
    console.log('Passports:');
    console.log('  Alice   → 4 badges (REST API, MongoDB, DB Schema, JWT Auth)');
    console.log('  Bob     → 1 badge  (REST API)');
    console.log('  Charlie → 0 badges (no approvals yet)');
    console.log('');
    console.log('Notifications:');
    console.log('  Alice   → 5 total (1 UNREAD: JWT approved)');
    console.log('  Bob     → 1 total (read)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
