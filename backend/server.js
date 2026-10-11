const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const healthRoutes = require('./src/routes/health');
const authRoutes = require('./src/routes/auth');
const studentRoutes = require('./src/routes/student');
const instructorRoutes = require('./src/routes/instructor');
const courseRoutes = require('./src/routes/courseRoutes');
const skillRoutes = require('./src/routes/skillRoutes');
const verificationRoutes = require('./src/routes/verificationRoutes');
const passportRoutes = require('./src/routes/passportRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const githubAuthRoutes = require('./src/routes/githubAuthRoutes');
const userRoutes = require('./src/routes/userRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://192.168.137.10:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.originalUrl}`);
    next();
  });
}

// API Routes (/api/v1)
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/instructor', instructorRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/verification-requests', verificationRoutes);
app.use('/api/v1/passport', passportRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/auth/github', githubAuthRoutes);
app.use('/api/v1/users', userRoutes);

// Backwards-compatible aliases
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/github', githubAuthRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/verification-requests', verificationRoutes);
app.use('/api/passport', passportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Direct aliases without /api prefix
app.use('/auth/github', githubAuthRoutes);
app.use('/courses', courseRoutes);
app.use('/students', studentRoutes);
app.use('/enrollments', enrollmentRoutes);
app.use('/verification-requests', verificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/users', userRoutes);



// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Micro-credential and Skill Passport API',
    health: '/api/health',
  });
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server if not in test environment
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = { app, server };
