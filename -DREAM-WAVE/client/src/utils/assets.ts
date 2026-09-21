/** Normalize legacy `/uploads/...` and absolute URLs to authenticated asset path. */
export function toAssetPath(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  const name = url.split(/[/\\]/).pop();
  if (!name || name.includes('..')) return '';
  return `/api/assets/${name}`;
}
