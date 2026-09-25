const { body } = require('express-validator');

const createStudentValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Temporary password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('batch').trim().notEmpty().withMessage('Batch is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('phone').optional().trim(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('semester').optional().isInt({ min: 1, max: 8 }),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }),
  body('backlogs').optional().isInt({ min: 0 }),
];

const updateStudentValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('semester').optional().isInt({ min: 1, max: 8 }),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }),
  body('backlogs').optional().isInt({ min: 0 }),
];

module.exports = { createStudentValidator, updateStudentValidator };
