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
  StudentPassport,
  Enrollment,
} = require('../models');

const seedDatabase = async () => {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/skill_passport';

  try {
    console.log(`[Seed] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected successfully.');

    // 1. Reset all collections (Idempotency)
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      MicroSkill.deleteMany({}),
      CourseSkill.deleteMany({}),
      StudentSkillStatus.deleteMany({}),
      VerificationRequest.deleteMany({}),
      StudentPassport.deleteMany({}),
      Enrollment.deleteMany({}),
    ]);
    console.log('[Seed] Collections cleared.');

    // 2. Seed Users
    console.log('[Seed] Creating users...');
    const instructor = await User.create({
      name: 'Dr. Jane Smith (Instructor)',
      email: 'instructor@test.com',
      password: 'password123',
      role: 'instructor',
    });

    const student1 = await User.create({
      name: 'Alice Johnson',
      email: 'student1@test.com',
      password: 'password123',
      role: 'student',
    });

    const student2 = await User.create({
      name: 'Bob Williams',
      email: 'student2@test.com',
      password: 'password123',
      role: 'student',
    });

    // Verify bcrypt hashing & comparePassword
    const verifyInstructor = await instructor.comparePassword('password123');
    const verifyStudent = await student1.comparePassword('password123');
    console.log(`[Seed] Created 1 Instructor & 2 Students.`);
    console.log(
      `[Seed] Password bcrypt verification: Instructor=${verifyInstructor ? 'OK' : 'FAIL'}, Student1=${verifyStudent ? 'OK' : 'FAIL'}`
    );

    // 3. Seed Courses
    console.log('[Seed] Creating courses...');
    const webDevCourse = await Course.create({
      name: 'Web Development',
      description: 'Comprehensive full-stack web development course with Node.js and React.',
      instructor_id: instructor._id,
    });

    const dbDesignCourse = await Course.create({
      name: 'Database Design',
      description: 'Relational and NoSQL database modeling, aggregation, and indexing techniques.',
      instructor_id: instructor._id,
    });
    console.log(`[Seed] Created 2 courses: "${webDevCourse.name}", "${dbDesignCourse.name}".`);

    // 4. Seed MicroSkills
    console.log('[Seed] Creating micro skills...');
    const skillApi = await MicroSkill.create({
      name: 'Build REST API with Express',
      description: 'Design and implement RESTful endpoints with validation and error handling.',
      criteria: 'Submit GitHub repository with complete CRUD endpoints and test suite.',
    });

    const skillMongo = await MicroSkill.create({
      name: 'MongoDB Aggregation Pipeline',
      description: 'Construct advanced aggregation stages ($match, $group, $lookup, $project).',
      criteria: 'Provide queries solving multi-collection reporting problem with explain plan.',
    });

    const skillReact = await MicroSkill.create({
      name: 'React Component Design',
      description: 'Build modular, accessible UI components with state hooks and context.',
      criteria: 'Deliver responsive frontend application passing UI component integration tests.',
    });
    console.log(`[Seed] Created 3 micro-skills.`);

    // 5. Link CourseSkills (Junction)
    console.log('[Seed] Linking skills to courses via CourseSkill junction...');
    // Link all 3 skills to Web Development
    const csWeb1 = await CourseSkill.create({
      course_id: webDevCourse._id,
      skill_id: skillApi._id,
    });
    const csWeb2 = await CourseSkill.create({
      course_id: webDevCourse._id,
      skill_id: skillMongo._id,
    });
    const csWeb3 = await CourseSkill.create({
      course_id: webDevCourse._id,
      skill_id: skillReact._id,
    });

    // Link 1 skill (MongoDB) to Database Design
    const csDb1 = await CourseSkill.create({
      course_id: dbDesignCourse._id,
      skill_id: skillMongo._id,
    });
    console.log(`[Seed] Linked 3 skills to "Web Development", 1 skill to "Database Design".`);

    // 6. Create StudentSkillStatus for student1
    console.log('[Seed] Creating initial StudentSkillStatus for student1...');
    const student1Statuses = await Promise.all([
      StudentSkillStatus.create({
        student_id: student1._id,
        course_skill_id: csWeb1._id,
        status: 'not_started',
      }),
      StudentSkillStatus.create({
        student_id: student1._id,
        course_skill_id: csWeb2._id,
        status: 'not_started',
      }),
      StudentSkillStatus.create({
        student_id: student1._id,
        course_skill_id: csWeb3._id,
        status: 'not_started',
      }),
      StudentSkillStatus.create({
        student_id: student1._id,
        course_skill_id: csDb1._id,
        status: 'not_started',
      }),
    ]);
    console.log(`[Seed] Created ${student1Statuses.length} 'not_started' skill statuses for student1.`);

    // 7. Create StudentPassport for student1 and student2
    console.log('[Seed] Creating empty StudentPassports...');
    await StudentPassport.create({
      student_id: student1._id,
      badges: [],
    });
    await StudentPassport.create({
      student_id: student2._id,
      badges: [],
    });
    console.log('[Seed] Created empty StudentPassports for student1 and student2.');

    // 8. Enrollments (TON-64)
    console.log('[Seed] Creating enrollments with TON-64 schema (status, completed_at)...');
    const enrollments = [
      await Enrollment.create({
        student_id: student1._id,
        course_id: webDevCourse._id,
        status: 'active',
      }),
      await Enrollment.create({
        student_id: student1._id,
        course_id: dbDesignCourse._id,
        status: 'completed',
      }),
      await Enrollment.create({
        student_id: student2._id,
        course_id: webDevCourse._id,
        status: 'active',
      }),
    ];
    console.log(`[Seed] Created ${enrollments.length} enrollments (active & completed with auto completed_at).`);

    console.log('----------------------------------------------------');
    console.log('[Seed] ALL COLLECTIONS SEEDED SUCCESSFULLY! (TON-63)');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error during seeding: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
