const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .isIn(['student', 'instructor'])
    .withMessage('Role must be either student or instructor'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const validateSubmitVerification = [
  body('courseSkillId')
    .notEmpty()
    .withMessage('Course skill ID is required')
    .isMongoId()
    .withMessage('Valid course skill ID is required'),
  body('evidenceUrl')
    .trim()
    .notEmpty()
    .withMessage('Evidence URL is required')
    .isURL()
    .withMessage('Valid URL format is required'),
  handleValidationErrors,
];

const validateUpdateVerification = [
  body('evidenceUrl')
    .trim()
    .notEmpty()
    .withMessage('Evidence URL is required')
    .isURL()
    .withMessage('Valid URL format is required'),
  handleValidationErrors,
];

const validateCreateCourse = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Course name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Course name must be between 2 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Course description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Course description must be between 10 and 2000 characters'),
  handleValidationErrors,
];

const validateUpdateCourse = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Course name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Course description cannot be empty')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Course description must be between 10 and 2000 characters'),
  handleValidationErrors,
];

const validateCreateSkill = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Skill name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Skill name must be between 2 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Skill description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Skill description must be between 10 and 2000 characters'),
  body('criteria')
    .trim()
    .notEmpty()
    .withMessage('Certification criteria is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Certification criteria must be between 10 and 2000 characters'),
  handleValidationErrors,
];

const validateUpdateSkill = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Skill name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Skill name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Skill description cannot be empty')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Skill description must be between 10 and 2000 characters'),
  body('criteria')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Certification criteria cannot be empty')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Certification criteria must be between 10 and 2000 characters'),
  handleValidationErrors,
];

const validateRejectVerification = [
  body('feedback')
    .trim()
    .notEmpty()
    .withMessage('Feedback is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Feedback must be between 5 and 2000 characters'),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateSubmitVerification,
  validateUpdateVerification,
  validateCreateCourse,
  validateUpdateCourse,
  validateCreateSkill,
  validateUpdateSkill,
  validateRejectVerification,
};
