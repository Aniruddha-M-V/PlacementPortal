const { PAGINATION } = require('../config/constants');

/**
 * Build a standardised pagination object from query params
 * @param {Object} query - Express req.query
 * @returns {{ page, limit, skip, sort }}
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  // Sort: e.g. ?sort=-createdAt  (prefix - for desc)
  let sort = {};
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const sortOrder = query.sort.startsWith('-') ? -1 : 1;
    sort[sortField] = sortOrder;
  } else {
    sort = { createdAt: -1 };
  }

  return { page, limit, skip, sort };
};

/**
 * Build pagination meta for the API response
 * @param {number} total - Total matching documents
 * @param {number} page - Current page
 * @param {number} limit - Page size
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

module.exports = { getPagination, buildPaginationMeta };
