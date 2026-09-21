/**
 * Canonical private asset path. Legacy `/uploads/...` values in DB still resolve by filename.
 */
function toAssetUrl(filename) {
  if (!filename) return '';
  const name = String(filename).split(/[/\\]/).pop();
  if (!name || name.includes('..')) return '';
  return `/api/assets/${name}`;
}

function filenameFromUrl(url) {
  if (!url) return '';
  return String(url).split(/[/\\]/).pop() || '';
}

module.exports = { toAssetUrl, filenameFromUrl };
