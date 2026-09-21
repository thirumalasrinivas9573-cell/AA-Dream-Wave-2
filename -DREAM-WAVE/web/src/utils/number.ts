/**
 * Locale-aware number formatting helpers.
 */

export function formatNumber(
  value: number,
  locales: Intl.LocalesArgument = "en-US",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locales, options).format(value);
}
