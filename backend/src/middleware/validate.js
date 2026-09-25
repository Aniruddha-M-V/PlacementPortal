const { validationResult } = require('express-validator');
const { sendBadRequest } = require('../utils/apiResponse');

/**
 * Middleware: Run after express-validator chains.
 * Collects validation errors and returns 400 if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendBadRequest(res, 'Validation failed', formatted);
  }
  next();
};

module.exports = validate;
