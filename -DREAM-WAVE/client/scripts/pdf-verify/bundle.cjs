"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../src/shared/pdf/sanitizeText.js
function sanitizeText(raw, options = {}) {
  if (raw === null || raw === void 0) return "";
  let str = String(raw);
  if (!options.isCode) {
    str = str.replace(KNOWN_HTML_TAGS, "");
    str = str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  if (options.safeMode) {
    str = str.replace(/[^\t\r\n\u0020-\u007E\u00A0-\u00FF\u2000-\u200B\u200E-\u206F\u20A0-\u20CF\u2200-\u22FF]/gu, "?");
    str = str.replace(/\?+/g, "?");
    return str;
  }
  for (const [pattern, replacement] of SYMBOL_REPLACEMENTS) {
    str = str.replace(pattern, replacement);
  }
  str = str.replace(EMOJI_REGEX, "");
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return str;
}
var KNOWN_HTML_TAGS, EMOJI_REGEX, SYMBOL_REPLACEMENTS;
var init_sanitizeText = __esm({
  "../../src/shared/pdf/sanitizeText.js"() {
    "use strict";
    KNOWN_HTML_TAGS = /<\/?(script|style|iframe|div|span|p|br|img|a|b|i|em|strong|table|tr|td|th|ul|ol|li|h[1-6])\b[^>]*>/gi;
    EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\uFE0F|[\uD83C\uDFFB-\uD83C\uDFFF])+(?:\u200D(?:\p{Emoji_Presentation}|\uFE0F|[\uD83C\uDFFB-\uD83C\uDFFF])+)*/gu;
    SYMBOL_REPLACEMENTS = [
      [/[\u2713\u2714\u2611]/g, "[x]"],
      // ✔, ✓, ☑ -> [x]
      [/[\u2610]/g, "[ ]"],
      // ☐ -> [ ]
      [/[\u2717\u2718]/g, "[-]"],
      // ✗, ✘ -> [-]
      [/\u26A0/g, "(!)"],
      // ⚠ -> (!)
      [/[\u2764\u2605\u2606]/g, ""]
      // ❤, ★, ☆ -> removed
    ];
  }
});

// ../../src/shared/pdf/fonts.js
function registerPdfFonts() {
  if (fontsRegistered) return Promise.resolve(REGISTERED_FONTS);
  if (fontRegistrationPromise) return fontRegistrationPromise;
  fontRegistrationPromise = (async () => {
    async function fontExists(url) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        const ct = res.headers.get("content-type") || "";
        return res.ok && !ct.includes("text/html");
      } catch (err) {
        console.warn(`[PDF Font Check] Failed to check ${url}:`, err);
        return false;
      }
    }
    const [
      hasRegular,
      hasBold,
      hasItalic,
      hasDevanagari,
      hasDevanagariBold,
      hasTelugu,
      hasTeluguBold
    ] = await Promise.all([
      fontExists("/fonts/NotoSans-Regular.ttf"),
      fontExists("/fonts/NotoSans-Bold.ttf"),
      fontExists("/fonts/NotoSans-Italic.ttf"),
      fontExists("/fonts/NotoSansDevanagari-Regular.ttf"),
      fontExists("/fonts/NotoSansDevanagari-Bold.ttf"),
      fontExists("/fonts/NotoSansTelugu-Regular.ttf"),
      fontExists("/fonts/NotoSansTelugu-Bold.ttf")
    ]);
    if (hasRegular && hasBold) {
      try {
        const fontList = [
          { src: "/fonts/NotoSans-Regular.ttf", fontWeight: "normal", fontStyle: "normal" },
          { src: "/fonts/NotoSans-Bold.ttf", fontWeight: "bold", fontStyle: "normal" }
        ];
        if (hasItalic) {
          fontList.push({ src: "/fonts/NotoSans-Italic.ttf", fontWeight: "normal", fontStyle: "italic" });
        }
        import_renderer.Font.register({ family: "NotoSans", fonts: fontList });
        PDF_FONT_FAMILY = "NotoSans";
        REGISTERED_FONTS.base = "NotoSans";
        REGISTERED_FONTS.hasBold = true;
        REGISTERED_FONTS.hasItalic = hasItalic;
      } catch (err) {
        console.warn("[PDF Font] NotoSans registration failed. Defaulting to Helvetica.", err);
        PDF_FONT_FAMILY = "Helvetica";
        REGISTERED_FONTS.base = "Helvetica";
      }
    } else {
      console.warn("[PDF Font Missing] NotoSans TTF files missing or returned 404 HTML fallback. Defaulting to Helvetica.");
      PDF_FONT_FAMILY = "Helvetica";
      REGISTERED_FONTS.base = "Helvetica";
    }
    if (hasDevanagari) {
      try {
        if (hasDevanagariBold) {
          import_renderer.Font.register({
            family: "NotoSansDevanagari",
            fonts: [
              { src: "/fonts/NotoSansDevanagari-Regular.ttf", fontWeight: "normal" },
              { src: "/fonts/NotoSansDevanagari-Bold.ttf", fontWeight: "bold" }
            ]
          });
          REGISTERED_FONTS.devanagariBold = true;
        } else {
          import_renderer.Font.register({ family: "NotoSansDevanagari", src: "/fonts/NotoSansDevanagari-Regular.ttf" });
        }
        INDIC_FONTS.devanagari = "NotoSansDevanagari";
        REGISTERED_FONTS.devanagari = "NotoSansDevanagari";
      } catch (err) {
        console.warn("[PDF Font] NotoSansDevanagari registration failed. Defaulting to Helvetica.", err);
        INDIC_FONTS.devanagari = REGISTERED_FONTS.base;
        REGISTERED_FONTS.devanagari = REGISTERED_FONTS.base;
      }
    } else {
      INDIC_FONTS.devanagari = REGISTERED_FONTS.base;
      REGISTERED_FONTS.devanagari = REGISTERED_FONTS.base;
    }
    if (hasTelugu) {
      try {
        if (hasTeluguBold) {
          import_renderer.Font.register({
            family: "NotoSansTelugu",
            fonts: [
              { src: "/fonts/NotoSansTelugu-Regular.ttf", fontWeight: "normal" },
              { src: "/fonts/NotoSansTelugu-Bold.ttf", fontWeight: "bold" }
            ]
          });
          REGISTERED_FONTS.teluguBold = true;
        } else {
          import_renderer.Font.register({ family: "NotoSansTelugu", src: "/fonts/NotoSansTelugu-Regular.ttf" });
        }
        INDIC_FONTS.telugu = "NotoSansTelugu";
        REGISTERED_FONTS.telugu = "NotoSansTelugu";
      } catch (err) {
        console.warn("[PDF Font] NotoSansTelugu registration failed. Defaulting to Helvetica.", err);
        INDIC_FONTS.telugu = REGISTERED_FONTS.base;
        REGISTERED_FONTS.telugu = REGISTERED_FONTS.base;
      }
    } else {
      INDIC_FONTS.telugu = REGISTERED_FONTS.base;
      REGISTERED_FONTS.telugu = REGISTERED_FONTS.base;
    }
    fontsRegistered = true;
    return REGISTERED_FONTS;
  })();
  return fontRegistrationPromise;
}
function clearEmittedRuns() {
  LAST_EMITTED_RUNS = [];
}
function splitTextByScript(textStr, baseFamily = PDF_FONT_FAMILY, options = {}) {
  if (textStr === null || textStr === void 0) return [];
  const str = String(textStr);
  if (!str) return [];
  const isTeluguRegistered = REGISTERED_FONTS.telugu !== "Helvetica";
  const isDevanagariRegistered = REGISTERED_FONTS.devanagari !== "Helvetica";
  const tokens = [];
  const tokenRegex = /([\u0C00-\u0C7F]+)|([\u0900-\u097F]+)|([A-Za-z\u00C0-\u024F]+)|([\u200C\u200D\s\d\p{P}\p{S}]+)/gu;
  let match;
  while ((match = tokenRegex.exec(str)) !== null) {
    if (match[1]) tokens.push({ text: match[1], type: "TELUGU" });
    else if (match[2]) tokens.push({ text: match[2], type: "DEVANAGARI" });
    else if (match[3]) tokens.push({ text: match[3], type: "LATIN" });
    else if (match[4]) tokens.push({ text: match[4], type: "NEUTRAL" });
  }
  if (!tokens.length) {
    const result = [{ text: str, fontFamily: baseFamily, script: "LATIN" }];
    LAST_EMITTED_RUNS.push({ text: str, script: "LATIN", fontFamily: baseFamily, fontWeight: options.fontWeight || "normal", fontStyle: options.fontStyle || "normal" });
    return result;
  }
  const resolved = tokens.map((t) => ({ ...t, resolvedType: t.type }));
  for (let i = 0; i < resolved.length; i++) {
    if (resolved[i].type === "NEUTRAL") {
      let prevScript = null;
      for (let j = i - 1; j >= 0; j--) {
        if (resolved[j].type !== "NEUTRAL") {
          prevScript = resolved[j].type;
          break;
        }
      }
      let nextScript = null;
      for (let j = i + 1; j < resolved.length; j++) {
        if (resolved[j].type !== "NEUTRAL") {
          nextScript = resolved[j].type;
          break;
        }
      }
      if (prevScript && nextScript && prevScript === nextScript) {
        resolved[i].resolvedType = prevScript;
      } else if (nextScript === "LATIN") {
        resolved[i].resolvedType = "LATIN";
      } else if (prevScript === "LATIN") {
        resolved[i].resolvedType = "LATIN";
      } else if (prevScript) {
        resolved[i].resolvedType = prevScript;
      } else if (nextScript) {
        resolved[i].resolvedType = nextScript;
      } else {
        resolved[i].resolvedType = "LATIN";
      }
    }
  }
  const mergedRuns = [];
  for (const t of resolved) {
    if (mergedRuns.length > 0 && mergedRuns[mergedRuns.length - 1].type === t.resolvedType) {
      mergedRuns[mergedRuns.length - 1].text += t.text;
    } else {
      mergedRuns.push({ text: t.text, type: t.resolvedType });
    }
  }
  const finalRuns = mergedRuns.filter((r) => r.text && r.text.length > 0).map((r) => {
    let fontFamily = baseFamily;
    let script = r.type;
    if (r.type === "TELUGU") {
      if (isTeluguRegistered && !options.safeMode) {
        fontFamily = REGISTERED_FONTS.telugu;
      } else {
        if (!warnedTelugu && !options.safeMode) {
          console.warn('[PDF Font] Telugu font (/fonts/NotoSansTelugu-Regular.ttf) is not registered. Replacing Telugu text with "?" to prevent layout crash.');
          warnedTelugu = true;
        }
        fontFamily = baseFamily;
        r.text = r.text.replace(/[\u0C00-\u0C7F\u200C\u200D]+/g, "?");
        script = "TELUGU (UNREGISTERED->?)";
      }
    } else if (r.type === "DEVANAGARI") {
      if (isDevanagariRegistered && !options.safeMode) {
        fontFamily = REGISTERED_FONTS.devanagari;
      } else {
        if (!warnedDevanagari && !options.safeMode) {
          console.warn('[PDF Font] Devanagari font (/fonts/NotoSansDevanagari-Regular.ttf) is not registered. Replacing Devanagari text with "?" to prevent layout crash.');
          warnedDevanagari = true;
        }
        fontFamily = baseFamily;
        r.text = r.text.replace(/[\u0900-\u097F\u200C\u200D]+/g, "?");
        script = "DEVANAGARI (UNREGISTERED->?)";
      }
    }
    const runObj = {
      text: r.text,
      fontFamily,
      script,
      fontWeight: options.fontWeight || "normal",
      fontStyle: options.fontStyle || "normal"
    };
    LAST_EMITTED_RUNS.push(runObj);
    return { text: r.text, fontFamily, script };
  });
  return finalRuns;
}
function sanitizeEmojiAndText(raw, options = {}) {
  return sanitizeText(raw, options);
}
var import_renderer, PDF_FONT_FAMILY, REGISTERED_FONTS, INDIC_FONTS, fontsRegistered, fontRegistrationPromise, warnedTelugu, warnedDevanagari, LAST_EMITTED_RUNS;
var init_fonts = __esm({
  "../../src/shared/pdf/fonts.js"() {
    "use strict";
    import_renderer = require("@react-pdf/renderer");
    init_sanitizeText();
    PDF_FONT_FAMILY = "Helvetica";
    REGISTERED_FONTS = {
      base: "Helvetica",
      hasBold: false,
      hasItalic: false,
      telugu: "Helvetica",
      teluguBold: false,
      devanagari: "Helvetica",
      devanagariBold: false
    };
    INDIC_FONTS = {
      devanagari: "Helvetica",
      telugu: "Helvetica"
    };
    fontsRegistered = false;
    fontRegistrationPromise = null;
    warnedTelugu = false;
    warnedDevanagari = false;
    LAST_EMITTED_RUNS = [];
  }
});

// entry.jsx
var import_react2 = __toESM(require("react"), 1);
var import_renderer7 = require("@react-pdf/renderer");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var pdfjsLib = __toESM(require("pdfjs-dist/legacy/build/pdf.mjs"), 1);

// ../../src/modules/student/pages/ReportPdf.jsx
var import_renderer6 = require("@react-pdf/renderer");

// ../../src/shared/pdf/PdfDocument.jsx
var import_renderer3 = require("@react-pdf/renderer");

// ../../src/shared/pdf/pdfStyles.js
var import_renderer2 = require("@react-pdf/renderer");
init_fonts();
var colors = {
  primary: "#4C1D95",
  primaryLight: "#8B5CF6",
  primaryBg: "#F5F3FF",
  textDark: "#1F2937",
  textMuted: "#6B7280",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  dangerBg: "#FEF2F2",
  dangerBorder: "#EF4444",
  dangerText: "#991B1B",
  successBg: "#ECFDF5",
  successBorder: "#10B981",
  successText: "#065F46",
  warningBg: "#FFFBEB",
  warningBorder: "#F59E0B",
  warningText: "#92400E"
};
function createPdfStyles(fontFamily = PDF_FONT_FAMILY) {
  return import_renderer2.StyleSheet.create({
    page: {
      size: "A4",
      paddingTop: 45,
      paddingBottom: 50,
      paddingHorizontal: 40,
      fontFamily,
      backgroundColor: "#FFFFFF"
    },
    header: {
      position: "absolute",
      top: 20,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderBottomStyle: "solid",
      paddingBottom: 4
    },
    headerTitle: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: colors.primaryLight,
      letterSpacing: 0.5,
      textTransform: "uppercase"
    },
    headerSubtitle: {
      fontSize: 7.5,
      color: colors.textMuted
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderTopStyle: "solid",
      paddingTop: 6
    },
    footerText: {
      fontSize: 7.5,
      color: colors.textLight
    },
    pageNumber: {
      fontSize: 7.5,
      color: colors.textMuted,
      fontWeight: "bold"
    },
    content: {
      flex: 1
    },
    section: {
      marginBottom: 14,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      borderBottomStyle: "solid"
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 6
    },
    sectionKey: {
      fontSize: 8,
      fontWeight: "bold",
      color: colors.textLight,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2
    },
    keyValueRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 3,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight
    },
    keyLabel: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: "bold"
    },
    keyValue: {
      fontSize: 9,
      color: colors.textDark
    },
    bulletItem: {
      flexDirection: "row",
      marginBottom: 4,
      paddingLeft: 8
    },
    bulletDot: {
      width: 10,
      fontSize: 9.5,
      color: colors.primaryLight
    },
    bulletText: {
      flex: 1,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: colors.textDark
    },
    table: {
      marginVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: "hidden"
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: 6
    },
    tableHeaderRow: {
      backgroundColor: "#F3F4F6",
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    tableCell: {
      flex: 1,
      fontSize: 8.5,
      color: colors.textDark
    },
    tableHeaderCell: {
      fontSize: 8.5,
      fontWeight: "bold",
      color: colors.primary
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: "#E5E7EB",
      borderRadius: 3,
      overflow: "hidden",
      marginVertical: 4
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: colors.primaryLight
    },
    badge: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: colors.textMuted,
      backgroundColor: "#F3F4F6",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3
    }
  });
}
var cachedStyles = null;
var cachedFontFamily = null;
function getPdfStyles() {
  if (!cachedStyles || cachedFontFamily !== PDF_FONT_FAMILY) {
    cachedStyles = createPdfStyles(PDF_FONT_FAMILY);
    cachedFontFamily = PDF_FONT_FAMILY;
  }
  return cachedStyles;
}

// ../../src/shared/pdf/PdfDocument.jsx
init_fonts();
var import_jsx_runtime = require("react/jsx-runtime");
function PdfDocument({ title = "Dream Wave Report", author = "Dream Wave AI", children }) {
  const cleanTitle = sanitizeEmojiAndText(title);
  const cleanAuthor = sanitizeEmojiAndText(author);
  const pdfStyles = getPdfStyles();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer3.Document, { title: cleanTitle, author: cleanAuthor, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer3.Page, { size: "A4", style: pdfStyles.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer3.View, { style: pdfStyles.header, fixed: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer3.Text, { style: pdfStyles.headerTitle, children: "DREAM WAVE AI" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer3.Text, { style: pdfStyles.headerSubtitle, children: "Research & Academic Intelligence" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer3.View, { style: pdfStyles.content, children }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer3.View, { style: pdfStyles.footer, fixed: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer3.Text, { style: pdfStyles.footerText, children: "Generated by Dream Wave AI Ecosystem" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_renderer3.Text,
        {
          style: pdfStyles.pageNumber,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`
        }
      )
    ] })
  ] }) });
}

// ../../src/shared/pdf/markdownToPdf.jsx
var import_renderer5 = require("@react-pdf/renderer");

// ../../src/shared/pdf/pdfComponents.jsx
var import_renderer4 = require("@react-pdf/renderer");
init_fonts();
var import_jsx_runtime2 = require("react/jsx-runtime");
function renderTextSegments(textStr, options = {}, keyPrefix = "seg") {
  if (textStr === null || textStr === void 0) return null;
  const baseFamily = options.safeMode ? "Helvetica" : PDF_FONT_FAMILY;
  const clean = sanitizeEmojiAndText(String(textStr), options);
  if (!clean) return null;
  const segments = splitTextByScript(clean, baseFamily, options);
  if (segments.length === 1 && segments[0].fontFamily === baseFamily) {
    return segments[0].text;
  }
  return segments.map((seg, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: { fontFamily: seg.fontFamily }, children: seg.text }, `${keyPrefix}-${i}`));
}
function Section({ title, sectionKey, children, style = {}, wrap = true, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_renderer4.View, { style: [styles.section, style], wrap, children: [
    sectionKey ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.sectionKey, children: renderTextSegments(sectionKey, options, "seckey") }) : null,
    title ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.sectionHeader, children: renderTextSegments(title, options, "sectitle") }) : null,
    children
  ] });
}
function BulletList({ items = [], options = {} }) {
  const styles = getPdfStyles();
  if (!items?.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.View, { wrap: true, children: items.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_renderer4.View, { style: styles.bulletItem, wrap: true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.bulletDot, children: "\u2022" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.bulletText, children: renderTextSegments(item, options, `bullet-${idx}`) })
  ] }, `bullet-${idx}`)) });
}
function Table({ headers = [], rows = [], options = {} }) {
  const styles = getPdfStyles();
  if (!headers?.length && !rows?.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_renderer4.View, { style: styles.table, wrap: true, children: [
    headers?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.View, { style: [styles.tableRow, styles.tableHeaderRow], wrap: false, children: headers.map((h, idx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.tableHeaderCell, children: renderTextSegments(h, options, `th-${idx}`) }, `th-${idx}`)) }),
    rows.map((row, rIdx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.View, { style: styles.tableRow, wrap: false, children: row.map((cell, cIdx) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: styles.tableCell, children: renderTextSegments(cell, options, `td-${rIdx}-${cIdx}`) }, `td-${rIdx}-${cIdx}`)) }, `tr-${rIdx}`))
  ] });
}
function Badge({ children, style = {}, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_renderer4.Text, { style: [styles.badge, style], children: renderTextSegments(children, options, "bdg") });
}

// ../../src/shared/pdf/markdownToPdf.jsx
init_fonts();
var import_jsx_runtime3 = require("react/jsx-runtime");
function getMarkdownStyles() {
  const baseFont = PDF_FONT_FAMILY;
  return import_renderer5.StyleSheet.create({
    paragraph: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: "#1F2937",
      marginBottom: 6,
      fontFamily: baseFont
    },
    h1: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#4C1D95",
      marginTop: 10,
      marginBottom: 4,
      fontFamily: baseFont
    },
    h2: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#6D28D9",
      marginTop: 8,
      marginBottom: 4,
      fontFamily: baseFont
    },
    h3: {
      fontSize: 10.5,
      fontWeight: "bold",
      color: "#374151",
      marginTop: 6,
      marginBottom: 3,
      fontFamily: baseFont
    },
    h4: {
      fontSize: 9.5,
      fontWeight: "bold",
      color: "#4B5563",
      marginTop: 5,
      marginBottom: 2,
      fontFamily: baseFont
    },
    bulletItem: {
      flexDirection: "row",
      marginBottom: 4,
      paddingLeft: 8
    },
    bulletDot: {
      width: 10,
      fontSize: 9.5,
      color: "#6D28D9"
    },
    bulletText: {
      flex: 1,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: "#1F2937",
      fontFamily: baseFont
    },
    blockquote: {
      backgroundColor: "#F5F3FF",
      borderLeftWidth: 3,
      borderLeftColor: "#8B5CF6",
      borderLeftStyle: "solid",
      padding: 6,
      marginVertical: 4,
      borderRadius: 2
    },
    blockquoteText: {
      fontSize: 9,
      fontStyle: "italic",
      color: "#4C1D95",
      fontFamily: baseFont
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
      borderBottomStyle: "solid",
      marginVertical: 8
    },
    codeBlock: {
      backgroundColor: "#F3F4F6",
      borderRadius: 4,
      padding: 6,
      marginVertical: 4,
      fontFamily: "Courier",
      fontSize: 8.5,
      color: "#1F2937"
    },
    bold: {
      fontWeight: "bold"
    },
    italic: {
      fontStyle: "italic"
    },
    linkText: {
      color: "#2563EB"
    },
    linkUrl: {
      fontSize: 8.5,
      color: "#6B7280",
      fontStyle: "italic"
    }
  });
}
function renderScriptSegments(textStr, options = {}, keyPrefix = "seg") {
  const baseFamily = options.safeMode ? "Helvetica" : PDF_FONT_FAMILY;
  const segments = splitTextByScript(textStr, baseFamily);
  if (segments.length === 1 && segments[0].fontFamily === baseFamily) {
    return segments[0].text;
  }
  return segments.map((seg, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: { fontFamily: seg.fontFamily }, children: seg.text }, `${keyPrefix}-${i}`));
}
function parseInline(textStr, styles, options = {}, keyPrefix = "inline") {
  const clean = sanitizeEmojiAndText(textStr, options);
  if (!clean) return null;
  const parts = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIdx = 0;
  let match;
  while ((match = linkRegex.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      parts.push(parseFormatting(clean.substring(lastIdx, match.index), styles, options, `${keyPrefix}-pre-${match.index}`));
    }
    const label = match[1];
    const url = match[2];
    parts.push(
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_renderer5.Text, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.linkText, children: renderScriptSegments(label, options, `${keyPrefix}-lnk-lbl-${match.index}`) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_renderer5.Text, { style: styles.linkUrl, children: [
          " (",
          url,
          ")"
        ] })
      ] }, `${keyPrefix}-link-${match.index}`)
    );
    lastIdx = linkRegex.lastIndex;
  }
  if (lastIdx < clean.length) {
    parts.push(parseFormatting(clean.substring(lastIdx), styles, options, `${keyPrefix}-post`));
  }
  return parts.length > 0 ? parts : parseFormatting(clean, styles, options, keyPrefix);
}
function parseFormatting(cleanStr, styles, options, keyPrefix) {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(cleanStr)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderScriptSegments(cleanStr.substring(lastIndex, match.index), options, `${keyPrefix}-txt-${lastIndex}`));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.bold, children: renderScriptSegments(token.slice(2, -2), options, `${keyPrefix}-b-seg-${match.index}`) }, `${keyPrefix}-b-${match.index}`)
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.italic, children: renderScriptSegments(token.slice(1, -1), options, `${keyPrefix}-i-seg-${match.index}`) }, `${keyPrefix}-i-${match.index}`)
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < cleanStr.length) {
    parts.push(renderScriptSegments(cleanStr.substring(lastIndex), options, `${keyPrefix}-end`));
  }
  return parts.length > 0 ? parts : renderScriptSegments(cleanStr, options, `${keyPrefix}-raw`);
}
function markdownToPdf(markdownText, options = {}) {
  if (!markdownText) return null;
  const styles = getMarkdownStyles(options);
  const text = String(markdownText).replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;
  let tableHeader = [];
  let tableRows = [];
  const flushTable = (key) => {
    if (inTable && (tableHeader.length || tableRows.length)) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Table, { headers: tableHeader, rows: tableRows }, `tbl-${key}`)
      );
      tableHeader = [];
      tableRows = [];
      inTable = false;
    }
  };
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      flushTable(index);
      if (inCodeBlock) {
        elements.push(
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.View, { style: styles.codeBlock, wrap: false, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { children: renderScriptSegments(codeBuffer.join("\n"), { ...options, isCode: true }, `code-${index}`) }) }, `code-${index}`)
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").slice(1, -1).map((c) => sanitizeEmojiAndText(c.trim()));
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        return;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      return;
    }
    flushTable(index);
    if (!trimmed) return;
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      elements.push(/* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.View, { style: styles.hr, wrap: false }, `hr-${index}`));
      return;
    }
    if (trimmed.startsWith("> ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.View, { style: styles.blockquote, wrap: true, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.blockquoteText, children: parseInline(trimmed.slice(2), styles, options, `bq-${index}`) }) }, `bq-${index}`)
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.h1, wrap: false, children: parseInline(trimmed.slice(2), styles, options, `h1-${index}`) }, `h1-${index}`)
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.h2, wrap: false, children: parseInline(trimmed.slice(3), styles, options, `h2-${index}`) }, `h2-${index}`)
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.h3, wrap: false, children: parseInline(trimmed.slice(4), styles, options, `h3-${index}`) }, `h3-${index}`)
      );
    } else if (trimmed.startsWith("#### ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.h4, wrap: false, children: parseInline(trimmed.slice(5), styles, options, `h4-${index}`) }, `h4-${index}`)
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("\u2022 ")) {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_renderer5.View, { style: styles.bulletItem, wrap: true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.bulletDot, children: "\u2022" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.bulletText, children: parseInline(trimmed.slice(2), styles, options, `bullet-${index}`) })
        ] }, `bullet-${index}`)
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/);
      const num = match ? match[1] : "\u2022";
      const contentStr = match ? match[2] : trimmed;
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_renderer5.View, { style: styles.bulletItem, wrap: true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.bulletDot, children: num }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.bulletText, children: parseInline(contentStr, styles, options, `num-${index}`) })
        ] }, `num-${index}`)
      );
    } else {
      elements.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_renderer5.Text, { style: styles.paragraph, wrap: true, children: parseInline(line, styles, options, `p-${index}`) }, `p-${index}`)
      );
    }
  });
  flushTable("end");
  return elements;
}

// ../../src/shared/pdf/index.js
init_fonts();

// ../../src/shared/hooks/usePdfExport.js
var import_react = require("react");

// ../../src/shared/components/DownloadPdfButton.jsx
var import_jsx_runtime4 = require("react/jsx-runtime");

// ../../src/modules/student/pages/ReportPdf.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function getCustomStyles() {
  return import_renderer6.StyleSheet.create({
    headerContainer: {
      marginBottom: 16,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primaryLight,
      borderBottomStyle: "solid",
      paddingBottom: 10
    },
    reportTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 6
    },
    workspaceTitle: {
      fontSize: 10,
      fontWeight: "bold",
      color: colors.primaryLight
    },
    researchQuestion: {
      fontSize: 9.5,
      color: colors.textMuted,
      fontStyle: "italic",
      marginTop: 2
    },
    summaryCard: {
      backgroundColor: colors.primaryBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryLight,
      borderLeftStyle: "solid",
      padding: 10,
      borderRadius: 4,
      marginBottom: 14
    },
    summaryHeading: {
      fontSize: 11,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: colors.textDark
    },
    reviewNotesCard: {
      backgroundColor: colors.dangerBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.dangerBorder,
      borderLeftStyle: "solid",
      padding: 10,
      borderRadius: 4,
      marginBottom: 14
    },
    reviewNotesHeading: {
      fontSize: 11,
      fontWeight: "bold",
      color: colors.dangerText,
      marginBottom: 4
    }
  });
}
function ReportPdf({ workspace = {}, report = {}, options = {} }) {
  const customStyles = getCustomStyles();
  const rawReportTitle = report.title || workspace.title || "Research Report";
  const rawWorkspaceTitle = workspace.title || "Research Workspace";
  const rawResearchQuestion = workspace.researchQuestion || "";
  const summary = report.summary || "";
  const qualityIssues = Array.isArray(report.qualityIssues) ? report.qualityIssues : [];
  const sections = Array.isArray(report.sections) ? report.sections : [];
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(PdfDocument, { title: sanitizeEmojiAndText(rawReportTitle, options), author: "Dream Wave AI", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.View, { style: customStyles.headerContainer, wrap: false, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_renderer6.Text, { style: customStyles.reportTitle, children: renderTextSegments(rawReportTitle, options, "rpt-title") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.Text, { style: customStyles.workspaceTitle, children: [
        "Workspace: ",
        renderTextSegments(rawWorkspaceTitle, options, "ws-title")
      ] }),
      rawResearchQuestion ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.Text, { style: customStyles.researchQuestion, children: [
        "Question: \u201C",
        renderTextSegments(rawResearchQuestion, options, "rq"),
        "\u201D"
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.View, { style: { flexDirection: "row", gap: 6, marginTop: 4 }, children: [
        report.template ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Badge, { options, children: [
          "Template: ",
          report.template
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Badge, { options, children: [
          "Date: ",
          (/* @__PURE__ */ new Date()).toLocaleDateString()
        ] })
      ] })
    ] }),
    summary.trim() ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.View, { style: customStyles.summaryCard, wrap: true, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_renderer6.Text, { style: customStyles.summaryHeading, children: "Executive Summary" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_renderer6.Text, { style: customStyles.summaryText, children: renderTextSegments(summary, options, "summary") })
    ] }) : null,
    qualityIssues.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_renderer6.View, { style: customStyles.reviewNotesCard, wrap: false, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_renderer6.Text, { style: customStyles.reviewNotesHeading, children: "Review Notes" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(BulletList, { items: qualityIssues, options })
    ] }) : null,
    sections.map((sec, idx) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      Section,
      {
        title: sec.title || sec.key || `Section ${idx + 1}`,
        sectionKey: sec.key || void 0,
        options,
        wrap: true,
        children: markdownToPdf(sec.content, options)
      },
      sec.key || `sec-${idx}`
    ))
  ] });
}

// entry.jsx
init_fonts();
var import_jsx_runtime6 = require("react/jsx-runtime");
var ROOT_DIR = import_path.default.resolve(process.cwd(), "../..");
var FONTS_DIR = import_path.default.resolve(ROOT_DIR, "client/public/fonts");
var OUT_DIR = import_path.default.resolve(process.cwd(), "out");
var mockMissingTelugu = false;
var originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  if (urlStr.includes("/fonts/")) {
    const filename = import_path.default.basename(urlStr);
    if (mockMissingTelugu && filename.includes("Telugu")) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => "text/html" }
      };
    }
    const fontPath = import_path.default.resolve(FONTS_DIR, filename);
    if (import_fs.default.existsSync(fontPath)) {
      if (options.method === "HEAD") {
        return {
          ok: true,
          status: 200,
          headers: { get: (h) => h.toLowerCase() === "content-type" ? "font/ttf" : null }
        };
      }
      const fontBuffer = import_fs.default.readFileSync(fontPath);
      return new Response(fontBuffer, {
        status: 200,
        headers: { "content-type": "font/ttf" }
      });
    } else {
      return {
        ok: false,
        status: 404,
        headers: { get: () => "text/html" }
      };
    }
  }
  if (originalFetch) return originalFetch(url, options);
  throw new Error(`Unhandled fetch: ${url}`);
};
async function inspectPdf(buffer) {
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;
  let extractedText = "";
  const fontNamesSet = /* @__PURE__ */ new Set();
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    extractedText += ` [Page ${i}]: ${pageText}`;
    for (const item of textContent.items) {
      if (item.fontName) fontNamesSet.add(item.fontName);
    }
    try {
      const opList = await page.getOperatorList();
      for (let j = 0; j < opList.fnArray.length; j++) {
        if (opList.fnArray[j] === pdfjsLib.OPS.setFont) {
          const fontArg = opList.argsArray[j][0];
          if (fontArg) fontNamesSet.add(String(fontArg));
        }
      }
    } catch (e) {
    }
  }
  return {
    pageCount,
    extractedText: extractedText.trim(),
    fontNames: Array.from(fontNamesSet)
  };
}
async function bisectCrash(report, options) {
  const testNodes = [];
  if (report.title) testNodes.push({ name: "title", text: report.title });
  if (report.summary) testNodes.push({ name: "summary", text: report.summary });
  if (report.qualityIssues) {
    report.qualityIssues.forEach((q, idx) => testNodes.push({ name: `qualityIssue-${idx}`, text: q }));
  }
  if (report.sections) {
    report.sections.forEach((sec, idx) => testNodes.push({ name: `section-${idx}`, text: sec.content }));
  }
  let smallestCrash = null;
  for (const node of testNodes) {
    const singleReport = {
      title: node.name === "title" ? node.text : "Test",
      summary: node.name === "summary" ? node.text : "",
      qualityIssues: node.name.startsWith("qualityIssue") ? [node.text] : [],
      sections: node.name.startsWith("section") ? [{ key: "s1", title: "Sec", content: node.text }] : []
    };
    try {
      clearEmittedRuns();
      const element = /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ReportPdf, { workspace: { title: "WS" }, report: singleReport, options });
      await (0, import_renderer7.renderToBuffer)(element);
    } catch (err) {
      const codePoints = Array.from(node.text).map((ch) => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
      smallestCrash = {
        nodeName: node.name,
        text: node.text,
        codePoints,
        error: err.message
      };
      break;
    }
  }
  return smallestCrash;
}
async function runSuite() {
  if (!import_fs.default.existsSync(OUT_DIR)) {
    import_fs.default.mkdirSync(OUT_DIR, { recursive: true });
  }
  const initialFonts = await registerPdfFonts();
  console.log("=== FONT SHIM VERIFICATION ===");
  console.log("Registered Fonts:", JSON.stringify(REGISTERED_FONTS, null, 2));
  console.log("===============================\n");
  const sampleMarkdownPath = import_path.default.resolve(ROOT_DIR, "client/src/shared/pdf/__fixtures__/sample-report-test.md");
  const sampleMarkdown = import_fs.default.existsSync(sampleMarkdownPath) ? import_fs.default.readFileSync(sampleMarkdownPath, "utf8") : "# Sample Report";
  const cases = [
    {
      id: "latin",
      report: {
        title: "Career growth \u20B96 LPA \u2014 plan",
        summary: "Career growth \u20B96 LPA \u2014 plan",
        qualityIssues: ["Career growth \u20B96 LPA \u2014 plan"],
        sections: [
          {
            key: "sec-1",
            title: "Latin Section",
            content: `Career growth \u20B96 LPA \u2014 plan

| Column 1 | Column 2 |
| --- | --- |
| Value A | Value B |

1. First step
2. Second step

\`\`\`js
const salary = 600000;
\`\`\``
          }
        ]
      },
      options: {},
      expectedLatin: ["Career", "growth", "plan", "Column"]
    },
    {
      id: "hindi",
      report: {
        title: "\u0921\u094D\u0930\u0940\u092E \u0935\u0947\u0935 \u090F\u0906\u0908 - \u0915\u0930\u093F\u092F\u0930 \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0928",
        summary: "\u0921\u094D\u0930\u0940\u092E \u0935\u0947\u0935 \u090F\u0906\u0908 - \u0915\u0930\u093F\u092F\u0930 \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0928",
        qualityIssues: ["\u0921\u094D\u0930\u0940\u092E \u0935\u0947\u0935 \u090F\u0906\u0908 - \u0915\u0930\u093F\u092F\u0930 \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0928"],
        sections: [{ key: "sec-1", title: "Hindi Section", content: "\u0921\u094D\u0930\u0940\u092E \u0935\u0947\u0935 \u090F\u0906\u0908 - \u0915\u0930\u093F\u092F\u0930 \u092E\u093E\u0930\u094D\u0917\u0926\u0930\u094D\u0936\u0928" }]
      },
      options: {},
      expectedLatin: ["Hindi", "Section"]
    },
    {
      id: "telugu",
      report: {
        title: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        summary: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D"],
        sections: [{ key: "sec-1", title: "Telugu Section", content: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D" }]
      },
      options: {},
      expectedLatin: ["Telugu", "Section"]
    },
    {
      id: "mixed",
      report: {
        title: "Hello \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 world\u0928\u092E\u0938\u094D\u0924\u0947 123",
        summary: "Hello \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 world\u0928\u092E\u0938\u094D\u0924\u0947 123",
        qualityIssues: ["Hello \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 world\u0928\u092E\u0938\u094D\u0924\u0947 123"],
        sections: [{ key: "sec-1", title: "Mixed Section", content: "Hello \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 world\u0928\u092E\u0938\u094D\u0924\u0947 123" }]
      },
      options: {},
      expectedLatin: ["Hello", "world", "123"]
    },
    {
      id: "telugu-in-table",
      report: {
        title: "Telugu in Table",
        summary: "Telugu and Hindi table testing",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D"],
        sections: [
          {
            key: "sec-1",
            title: "Table Section",
            content: "| \u0C24\u0C46\u0C32\u0C41\u0C17\u0C41 | \u0939\u093F\u0928\u094D\u0926\u0940 |\n| --- | --- |\n| \u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D | \u0921\u094D\u0930\u0940\u092E \u0935\u0947\u0935 |"
          }
        ]
      },
      options: {},
      expectedLatin: ["Telugu in Table", "Table Section"]
    },
    {
      id: "telugu-in-bullets",
      report: {
        title: "Telugu Bullets",
        summary: "Telugu bullet list testing",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D"],
        sections: [
          {
            key: "sec-1",
            title: "List Section",
            content: "- \u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10\n- \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D\n\n1. \u0C2E\u0C4A\u0C26\u0C1F\u0C3F \u0C05\u0C02\u0C36\u0C02\n2. \u0C30\u0C46\u0C02\u0C21\u0C35 \u0C05\u0C02\u0C36\u0C02"
          }
        ]
      },
      options: {},
      expectedLatin: ["Telugu Bullets", "List Section"]
    },
    {
      id: "telugu-bold",
      report: {
        title: "Telugu Bold Test",
        summary: "Bold weight fallback testing",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D"],
        sections: [
          {
            key: "sec-1",
            title: "Bold Section",
            content: "## \u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10\n\n**\u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D** \u0C2E\u0C30\u0C3F\u0C2F\u0C41 **\u0C2E\u0C30\u0C3F\u0C15\u0C4A\u0C28\u0C4D\u0C28\u0C3F \u0C35\u0C3F\u0C37\u0C2F\u0C3E\u0C32\u0C41**"
          }
        ]
      },
      options: {},
      expectedLatin: ["Telugu Bold Test", "Bold Section"]
    },
    {
      id: "edge-runs",
      report: {
        title: "Edge Runs Test",
        summary: "\u200C\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41",
        qualityIssues: ["\u0C4D", "", "\u200D"],
        sections: [
          {
            key: "sec-1",
            title: "Edge Section",
            content: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41\u0C4D"
          }
        ]
      },
      options: {},
      expectedLatin: ["Edge Runs Test", "Edge Section"]
    },
    {
      id: "full-fixture",
      report: {
        title: "Full Fixture Report",
        summary: "Full fixture markdown test",
        qualityIssues: ["Quality check 1"],
        sections: [{ key: "sec-1", title: "Fixture Section", content: sampleMarkdown }]
      },
      options: {},
      expectedLatin: ["Report", "Section"]
    },
    {
      id: "fonts-missing",
      isMissingTelugu: true,
      report: {
        title: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        summary: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D"],
        sections: [{ key: "sec-1", title: "Telugu Unregistered", content: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D" }]
      },
      options: {},
      expectedLatin: ["Telugu Unregistered"]
    },
    {
      id: "safe-mode",
      report: {
        title: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        summary: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
        qualityIssues: ["\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D"],
        sections: [{ key: "sec-1", title: "Safe Mode Test", content: "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C0F\u0C10 - \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D" }]
      },
      options: { safeMode: true },
      expectedLatin: ["Safe Mode Test"]
    }
  ];
  const results = [];
  for (const c of cases) {
    if (c.isMissingTelugu) {
      mockMissingTelugu = true;
      REGISTERED_FONTS.telugu = "Helvetica";
    } else {
      mockMissingTelugu = false;
      REGISTERED_FONTS.telugu = "NotoSansTelugu";
    }
    clearEmittedRuns();
    const outPath = import_path.default.resolve(OUT_DIR, `${c.id}.pdf`);
    let status = "SUCCESS";
    let bytes = 0;
    let pageCount = 0;
    let extractedText = "";
    let fontNames = [];
    let errorInfo = null;
    let emittedRunsCopy = [];
    let bisectInfo = null;
    try {
      const element = /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ReportPdf, { workspace: { title: "Workspace Title" }, report: c.report, options: c.options });
      const pdfBuffer = await (0, import_renderer7.renderToBuffer)(element);
      emittedRunsCopy = [...LAST_EMITTED_RUNS];
      bytes = pdfBuffer.length;
      import_fs.default.writeFileSync(outPath, pdfBuffer);
      const inspection = await inspectPdf(pdfBuffer);
      pageCount = inspection.pageCount;
      extractedText = inspection.extractedText;
      fontNames = inspection.fontNames;
    } catch (err) {
      status = "FAILURE";
      emittedRunsCopy = [...LAST_EMITTED_RUNS];
      const stackLines = (err.stack || "").split("\n").slice(0, 15).join("\n");
      errorInfo = {
        message: err.message,
        stackLines
      };
      if (err.message.includes("xCoordinate")) {
        bisectInfo = await bisectCrash(c.report, c.options);
      }
    }
    results.push({
      id: c.id,
      status,
      bytes,
      pageCount,
      outPath,
      emittedRuns: emittedRunsCopy,
      extractedText,
      fontNames,
      expectedLatin: c.expectedLatin,
      errorInfo,
      bisectInfo
    });
  }
  console.log("JSON_RESULT_START");
  console.log(JSON.stringify(results, null, 2));
  console.log("JSON_RESULT_END");
}
runSuite().catch((err) => {
  console.error("SUITE_ERROR:", err);
  process.exit(1);
});
