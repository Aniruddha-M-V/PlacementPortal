const { body } = require('express-validator');

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
  body('role').isIn(['admin', 'faculty', 'student']).withMessage('Invalid role'),
];

const updateUserValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim(),
];

module.exports = { createUserValidator, updateUserValidator };
