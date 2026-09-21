/**
 * Canonical pagination helpers for list endpoints.
 * Prefer `data.pagination` in API responses.
 */
function parsePagination(query = {}, { defaultLimit = 50, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginationMeta(page, limit, total) {
  const safeLimit = Math.max(1, limit);
  const safeTotal = Math.max(0, Number(total) || 0);
  const pages = Math.max(1, Math.ceil(safeTotal / safeLimit) || 1);
  return {
    page,
    limit: safeLimit,
    total: safeTotal,
    pages,
    hasMore: page * safeLimit < safeTotal,
  };
}

module.exports = { parsePagination, paginationMeta };
