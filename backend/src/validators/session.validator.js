const { body } = require('express-validator');

const createSessionValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
    .custom((val, { req }) => {
      if (new Date(val) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('mode').optional().isIn(['online', 'offline', 'hybrid']),
];

const updateSessionValidator = [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']),
  body('mode').optional().isIn(['online', 'offline', 'hybrid']),
];

module.exports = { createSessionValidator, updateSessionValidator };
