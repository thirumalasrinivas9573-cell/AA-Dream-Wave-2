/**
 * Safely parses a JSON string, extracting it with regex if necessary.
 * @param {string} str - The string to parse.
 * @param {Object} fallback - The fallback object to return on failure.
 * @returns {Object}
 */
const safeJsonParse = (str, fallback = {}) => {
  if (!str) return fallback;

  try {
    return JSON.parse(str);
  } catch (err) {
    console.warn("[safeJsonParse] Standard parse failed, attempting regex extraction...");
    try {
      // Regex to extract JSON block from string (in case of extra text around it)
      const jsonMatch = str.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (regexErr) {
      console.error("[safeJsonParse] Regex extraction failed:", regexErr.message);
    }
    return fallback;
  }
};

module.exports = safeJsonParse;
