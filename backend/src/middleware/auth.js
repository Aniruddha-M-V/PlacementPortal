const { verifyToken, extractToken } = require('../utils/generateToken');
const { sendUnauthorized, sendForbidden } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * Middleware: Verify JWT and attach user to req.user
 */
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return sendUnauthorized(res, 'Access denied. No token provided.');
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return sendUnauthorized(res, 'Token is invalid. User not found.');
    }

    if (!user.isActive) {
      return sendForbidden(res, 'Your account has been deactivated.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendUnauthorized(res, 'Invalid token.');
    }
    if (error.name === 'TokenExpiredError') {
      return sendUnauthorized(res, 'Token has expired. Please log in again.');
    }
    next(error);
  }
};

/**
 * Middleware: Restrict access to specific roles
 * Usage: authorize('admin', 'faculty')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return sendForbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}.`
      );
    }

    next();
  };
};

module.exports = { protect, authorize };
