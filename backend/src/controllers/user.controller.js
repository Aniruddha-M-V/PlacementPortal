const User = require('../models/User');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');

// GET /api/users
const getUsers = async (req, res) => {
  const { page, limit, skip, sort } = getPagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, users, 'Users fetched', 200, buildPaginationMeta(total, page, limit));
};

// POST /api/users
const createUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const user = await User.create({ name, email, password, role, phone });
  return sendCreated(res, user, 'User created successfully');
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendNotFound(res, 'User not found');
  return sendSuccess(res, user);
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  const { name, email, phone, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, isActive },
    { new: true, runValidators: true }
  );
  if (!user) return sendNotFound(res, 'User not found');
  return sendSuccess(res, user, 'User updated');
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendNotFound(res, 'User not found');
  if (user._id.toString() === req.user._id.toString()) {
    return sendBadRequest(res, 'You cannot delete your own account');
  }
  await user.deleteOne();
  return sendSuccess(res, null, 'User deleted');
};

module.exports = { getUsers, createUser, getUserById, updateUser, deleteUser };
