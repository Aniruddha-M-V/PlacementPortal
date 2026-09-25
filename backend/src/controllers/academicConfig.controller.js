const AcademicConfig = require('../models/AcademicConfig');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/apiResponse');

// GET /api/academic-config?type=department|batch
const getAll = async (req, res) => {
  const { type, activeOnly } = req.query;
  if (type && !['department', 'batch'].includes(type)) {
    return sendBadRequest(res, 'type must be "department" or "batch"');
  }
  const filter = {};
  if (type) filter.type = type;
  if (activeOnly === 'true') filter.isActive = true;

  const items = await AcademicConfig.find(filter).sort({ name: 1 });
  return sendSuccess(res, items, 'Academic config fetched');
};

// POST /api/academic-config
const create = async (req, res) => {
  const { type, name } = req.body;
  if (!type || !name) return sendBadRequest(res, '"type" and "name" are required');

  const item = await AcademicConfig.create({ type, name: name.trim(), isActive: true });
  return sendCreated(res, item, `${type} created`);
};

// PUT /api/academic-config/:id
const update = async (req, res) => {
  const { name } = req.body;
  if (!name) return sendBadRequest(res, '"name" is required');

  const item = await AcademicConfig.findByIdAndUpdate(
    req.params.id,
    { name: name.trim() },
    { new: true, runValidators: true }
  );
  if (!item) return sendNotFound(res, 'Item not found');
  return sendSuccess(res, item, 'Updated');
};

// PATCH /api/academic-config/:id/toggle
const toggleActive = async (req, res) => {
  const item = await AcademicConfig.findById(req.params.id);
  if (!item) return sendNotFound(res, 'Item not found');
  item.isActive = !item.isActive;
  await item.save();
  return sendSuccess(res, item, `${item.isActive ? 'Activated' : 'Deactivated'}`);
};

// DELETE /api/academic-config/:id  (admin only — use sparingly)
const remove = async (req, res) => {
  const item = await AcademicConfig.findById(req.params.id);
  if (!item) return sendNotFound(res, 'Item not found');
  await item.deleteOne();
  return sendSuccess(res, null, 'Deleted');
};

module.exports = { getAll, create, update, toggleActive, remove };
