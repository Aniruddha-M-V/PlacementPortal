const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const {
  sendSuccess,
  sendCreated,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
} = require('../utils/apiResponse');

/**
 * POST /api/auth/login
 * Public
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Fetch user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    return sendUnauthorized(res, 'Invalid email or password.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return sendUnauthorized(res, 'Invalid email or password.');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken({ id: user._id, role: user.role });

  return sendSuccess(
    res,
    {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        lastLogin: user.lastLogin,
      },
    },
    'Login successful'
  );
};

/**
 * GET /api/auth/me
 * Protected
 */
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return sendNotFound(res, 'User not found.');
  return sendSuccess(res, user, 'User profile fetched');
};

/**
 * PUT /api/auth/change-password
 * Protected
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) return sendNotFound(res, 'User not found.');

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) {
    return sendBadRequest(res, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, null, 'Password changed successfully.');
};

/**
 * POST /api/auth/logout
 * Protected — JWT is stateless; client discards token.
 * Server-side: just confirm.
 */
const logout = async (req, res) => {
  return sendSuccess(res, null, 'Logged out successfully.');
};

module.exports = { login, getMe, changePassword, logout };
