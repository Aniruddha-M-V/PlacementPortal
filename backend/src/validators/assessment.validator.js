const { body } = require('express-validator');

const createAssessmentValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('category').isIn(['aptitude', 'technical', 'coding', 'resume', 'mock_interview', 'soft_skills'])
    .withMessage('Invalid assessment category'),
  body('student').isMongoId().withMessage('Valid student ID is required'),
  body('maxMarks').isFloat({ min: 1 }).withMessage('Max marks must be at least 1'),
  body('marksObtained').isFloat({ min: 0 }).withMessage('Marks obtained must be 0 or more')
    .custom((val, { req }) => {
      if (parseFloat(val) > parseFloat(req.body.maxMarks)) {
        throw new Error('Marks obtained cannot exceed max marks');
      }
      return true;
    }),
  body('date').optional().isISO8601(),
  body('remarks').optional().trim(),
];

const updateAssessmentValidator = [
  body('marksObtained').optional().isFloat({ min: 0 }),
  body('remarks').optional().trim(),
];

module.exports = { createAssessmentValidator, updateAssessmentValidator };
