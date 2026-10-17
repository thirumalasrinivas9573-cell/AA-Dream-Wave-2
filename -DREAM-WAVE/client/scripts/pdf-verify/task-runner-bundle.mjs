var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

// client/src/shared/pdf/sanitizeText.js
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
  "client/src/shared/pdf/sanitizeText.js"() {
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

// client/src/shared/pdf/fonts.js
import { Font } from "@react-pdf/renderer";
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
        Font.register({ family: "NotoSans", fonts: fontList });
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
          Font.register({
            family: "NotoSansDevanagari",
            fonts: [
              { src: "/fonts/NotoSansDevanagari-Regular.ttf", fontWeight: "normal" },
              { src: "/fonts/NotoSansDevanagari-Bold.ttf", fontWeight: "bold" }
            ]
          });
          REGISTERED_FONTS.devanagariBold = true;
        } else {
          Font.register({ family: "NotoSansDevanagari", src: "/fonts/NotoSansDevanagari-Regular.ttf" });
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
          Font.register({
            family: "NotoSansTelugu",
            fonts: [
              { src: "/fonts/NotoSansTelugu-Regular.ttf", fontWeight: "normal" },
              { src: "/fonts/NotoSansTelugu-Bold.ttf", fontWeight: "bold" }
            ]
          });
          REGISTERED_FONTS.teluguBold = true;
        } else {
          Font.register({ family: "NotoSansTelugu", src: "/fonts/NotoSansTelugu-Regular.ttf" });
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
var PDF_FONT_FAMILY, REGISTERED_FONTS, INDIC_FONTS, fontsRegistered, fontRegistrationPromise, warnedTelugu, warnedDevanagari, LAST_EMITTED_RUNS;
var init_fonts = __esm({
  "client/src/shared/pdf/fonts.js"() {
    "use strict";
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

// client/scripts/pdf-verify/task-runner.jsx
import React from "react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as fontkit from "fontkit";
import { Font as Font2, renderToBuffer } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// client/src/modules/student/pages/ReportPdf.jsx
import { Text as Text4, View as View4, StyleSheet as StyleSheet3 } from "@react-pdf/renderer";

// client/src/shared/pdf/PdfDocument.jsx
import { Document, Page, Text, View } from "@react-pdf/renderer";

// client/src/shared/pdf/pdfStyles.js
init_fonts();
import { StyleSheet } from "@react-pdf/renderer";
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
  return StyleSheet.create({
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

// client/src/shared/pdf/PdfDocument.jsx
init_fonts();
import { jsx, jsxs } from "react/jsx-runtime";
function PdfDocument({ title = "Dream Wave Report", author = "Dream Wave AI", children }) {
  const cleanTitle = sanitizeEmojiAndText(title);
  const cleanAuthor = sanitizeEmojiAndText(author);
  const pdfStyles = getPdfStyles();
  return /* @__PURE__ */ jsx(Document, { title: cleanTitle, author: cleanAuthor, children: /* @__PURE__ */ jsxs(Page, { size: "A4", style: pdfStyles.page, children: [
    /* @__PURE__ */ jsxs(View, { style: pdfStyles.header, fixed: true, children: [
      /* @__PURE__ */ jsx(Text, { style: pdfStyles.headerTitle, children: "DREAM WAVE AI" }),
      /* @__PURE__ */ jsx(Text, { style: pdfStyles.headerSubtitle, children: "Research & Academic Intelligence" })
    ] }),
    /* @__PURE__ */ jsx(View, { style: pdfStyles.content, children }),
    /* @__PURE__ */ jsxs(View, { style: pdfStyles.footer, fixed: true, children: [
      /* @__PURE__ */ jsx(Text, { style: pdfStyles.footerText, children: "Generated by Dream Wave AI Ecosystem" }),
      /* @__PURE__ */ jsx(
        Text,
        {
          style: pdfStyles.pageNumber,
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`
        }
      )
    ] })
  ] }) });
}

// client/src/shared/pdf/markdownToPdf.jsx
import { Text as Text3, View as View3, StyleSheet as StyleSheet2 } from "@react-pdf/renderer";

// client/src/shared/pdf/pdfComponents.jsx
import { Text as Text2, View as View2 } from "@react-pdf/renderer";
init_fonts();
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function renderTextSegments(textStr, options = {}, keyPrefix = "seg") {
  if (textStr === null || textStr === void 0) return null;
  const baseFamily = options.safeMode ? "Helvetica" : PDF_FONT_FAMILY;
  const clean = sanitizeEmojiAndText(String(textStr), options);
  if (!clean) return null;
  const segments = splitTextByScript(clean, baseFamily, options);
  if (segments.length === 1 && segments[0].fontFamily === baseFamily) {
    return segments[0].text;
  }
  return segments.map((seg, i) => /* @__PURE__ */ jsx2(Text2, { style: { fontFamily: seg.fontFamily }, children: seg.text }, `${keyPrefix}-${i}`));
}
function Section({ title, sectionKey, children, style = {}, wrap = true, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ jsxs2(View2, { style: [styles.section, style], wrap, children: [
    sectionKey ? /* @__PURE__ */ jsx2(Text2, { style: styles.sectionKey, children: renderTextSegments(sectionKey, options, "seckey") }) : null,
    title ? /* @__PURE__ */ jsx2(Text2, { style: styles.sectionHeader, children: renderTextSegments(title, options, "sectitle") }) : null,
    children
  ] });
}
function BulletList({ items = [], options = {} }) {
  const styles = getPdfStyles();
  if (!items?.length) return null;
  return /* @__PURE__ */ jsx2(View2, { wrap: true, children: items.map((item, idx) => /* @__PURE__ */ jsxs2(View2, { style: styles.bulletItem, wrap: true, children: [
    /* @__PURE__ */ jsx2(Text2, { style: styles.bulletDot, children: "\u2022" }),
    /* @__PURE__ */ jsx2(Text2, { style: styles.bulletText, children: renderTextSegments(item, options, `bullet-${idx}`) })
  ] }, `bullet-${idx}`)) });
}
function Table({ headers = [], rows = [], options = {} }) {
  const styles = getPdfStyles();
  if (!headers?.length && !rows?.length) return null;
  return /* @__PURE__ */ jsxs2(View2, { style: styles.table, wrap: true, children: [
    headers?.length > 0 && /* @__PURE__ */ jsx2(View2, { style: [styles.tableRow, styles.tableHeaderRow], wrap: false, children: headers.map((h, idx) => /* @__PURE__ */ jsx2(Text2, { style: styles.tableHeaderCell, children: renderTextSegments(h, options, `th-${idx}`) }, `th-${idx}`)) }),
    rows.map((row, rIdx) => /* @__PURE__ */ jsx2(View2, { style: styles.tableRow, wrap: false, children: row.map((cell, cIdx) => /* @__PURE__ */ jsx2(Text2, { style: styles.tableCell, children: renderTextSegments(cell, options, `td-${rIdx}-${cIdx}`) }, `td-${rIdx}-${cIdx}`)) }, `tr-${rIdx}`))
  ] });
}
function Badge({ children, style = {}, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ jsx2(Text2, { style: [styles.badge, style], children: renderTextSegments(children, options, "bdg") });
}

// client/src/shared/pdf/markdownToPdf.jsx
init_fonts();
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function getMarkdownStyles() {
  const baseFont = PDF_FONT_FAMILY;
  return StyleSheet2.create({
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
  return segments.map((seg, i) => /* @__PURE__ */ jsx3(Text3, { style: { fontFamily: seg.fontFamily }, children: seg.text }, `${keyPrefix}-${i}`));
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
      /* @__PURE__ */ jsxs3(Text3, { children: [
        /* @__PURE__ */ jsx3(Text3, { style: styles.linkText, children: renderScriptSegments(label, options, `${keyPrefix}-lnk-lbl-${match.index}`) }),
        /* @__PURE__ */ jsxs3(Text3, { style: styles.linkUrl, children: [
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
        /* @__PURE__ */ jsx3(Text3, { style: styles.bold, children: renderScriptSegments(token.slice(2, -2), options, `${keyPrefix}-b-seg-${match.index}`) }, `${keyPrefix}-b-${match.index}`)
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.italic, children: renderScriptSegments(token.slice(1, -1), options, `${keyPrefix}-i-seg-${match.index}`) }, `${keyPrefix}-i-${match.index}`)
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
        /* @__PURE__ */ jsx3(Table, { headers: tableHeader, rows: tableRows }, `tbl-${key}`)
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
          /* @__PURE__ */ jsx3(View3, { style: styles.codeBlock, wrap: false, children: /* @__PURE__ */ jsx3(Text3, { children: renderScriptSegments(codeBuffer.join("\n"), { ...options, isCode: true }, `code-${index}`) }) }, `code-${index}`)
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
      elements.push(/* @__PURE__ */ jsx3(View3, { style: styles.hr, wrap: false }, `hr-${index}`));
      return;
    }
    if (trimmed.startsWith("> ")) {
      elements.push(
        /* @__PURE__ */ jsx3(View3, { style: styles.blockquote, wrap: true, children: /* @__PURE__ */ jsx3(Text3, { style: styles.blockquoteText, children: parseInline(trimmed.slice(2), styles, options, `bq-${index}`) }) }, `bq-${index}`)
      );
      return;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.h1, wrap: false, children: parseInline(trimmed.slice(2), styles, options, `h1-${index}`) }, `h1-${index}`)
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.h2, wrap: false, children: parseInline(trimmed.slice(3), styles, options, `h2-${index}`) }, `h2-${index}`)
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.h3, wrap: false, children: parseInline(trimmed.slice(4), styles, options, `h3-${index}`) }, `h3-${index}`)
      );
    } else if (trimmed.startsWith("#### ")) {
      elements.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.h4, wrap: false, children: parseInline(trimmed.slice(5), styles, options, `h4-${index}`) }, `h4-${index}`)
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("\u2022 ")) {
      elements.push(
        /* @__PURE__ */ jsxs3(View3, { style: styles.bulletItem, wrap: true, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles.bulletDot, children: "\u2022" }),
          /* @__PURE__ */ jsx3(Text3, { style: styles.bulletText, children: parseInline(trimmed.slice(2), styles, options, `bullet-${index}`) })
        ] }, `bullet-${index}`)
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/);
      const num = match ? match[1] : "\u2022";
      const contentStr = match ? match[2] : trimmed;
      elements.push(
        /* @__PURE__ */ jsxs3(View3, { style: styles.bulletItem, wrap: true, children: [
          /* @__PURE__ */ jsx3(Text3, { style: styles.bulletDot, children: num }),
          /* @__PURE__ */ jsx3(Text3, { style: styles.bulletText, children: parseInline(contentStr, styles, options, `num-${index}`) })
        ] }, `num-${index}`)
      );
    } else {
      elements.push(
        /* @__PURE__ */ jsx3(Text3, { style: styles.paragraph, wrap: true, children: parseInline(line, styles, options, `p-${index}`) }, `p-${index}`)
      );
    }
  });
  flushTable("end");
  return elements;
}

// client/src/shared/pdf/index.js
init_fonts();

// client/src/shared/hooks/usePdfExport.js
import { useCallback, useState } from "react";

// client/src/shared/components/DownloadPdfButton.jsx
import { jsx as jsx4 } from "react/jsx-runtime";

// client/src/modules/student/pages/ReportPdf.jsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function getCustomStyles() {
  return StyleSheet3.create({
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
  return /* @__PURE__ */ jsxs4(PdfDocument, { title: sanitizeEmojiAndText(rawReportTitle, options), author: "Dream Wave AI", children: [
    /* @__PURE__ */ jsxs4(View4, { style: customStyles.headerContainer, wrap: false, children: [
      /* @__PURE__ */ jsx5(Text4, { style: customStyles.reportTitle, children: renderTextSegments(rawReportTitle, options, "rpt-title") }),
      /* @__PURE__ */ jsxs4(Text4, { style: customStyles.workspaceTitle, children: [
        "Workspace: ",
        renderTextSegments(rawWorkspaceTitle, options, "ws-title")
      ] }),
      rawResearchQuestion ? /* @__PURE__ */ jsxs4(Text4, { style: customStyles.researchQuestion, children: [
        "Question: \u201C",
        renderTextSegments(rawResearchQuestion, options, "rq"),
        "\u201D"
      ] }) : null,
      /* @__PURE__ */ jsxs4(View4, { style: { flexDirection: "row", gap: 6, marginTop: 4 }, children: [
        report.template ? /* @__PURE__ */ jsxs4(Badge, { options, children: [
          "Template: ",
          report.template
        ] }) : null,
        /* @__PURE__ */ jsxs4(Badge, { options, children: [
          "Date: ",
          (/* @__PURE__ */ new Date()).toLocaleDateString()
        ] })
      ] })
    ] }),
    summary.trim() ? /* @__PURE__ */ jsxs4(View4, { style: customStyles.summaryCard, wrap: true, children: [
      /* @__PURE__ */ jsx5(Text4, { style: customStyles.summaryHeading, children: "Executive Summary" }),
      /* @__PURE__ */ jsx5(Text4, { style: customStyles.summaryText, children: renderTextSegments(summary, options, "summary") })
    ] }) : null,
    qualityIssues.length > 0 ? /* @__PURE__ */ jsxs4(View4, { style: customStyles.reviewNotesCard, wrap: false, children: [
      /* @__PURE__ */ jsx5(Text4, { style: customStyles.reviewNotesHeading, children: "Review Notes" }),
      /* @__PURE__ */ jsx5(BulletList, { items: qualityIssues, options })
    ] }) : null,
    sections.map((sec, idx) => /* @__PURE__ */ jsx5(
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

// client/scripts/pdf-verify/task-runner.jsx
init_fonts();
import { jsx as jsx6 } from "react/jsx-runtime";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var CLIENT_DIR = path.resolve(__dirname, "../..");
var ROOT_DIR = path.resolve(CLIENT_DIR, "..");
var FONTS_DIR = path.resolve(CLIENT_DIR, "public/fonts");
var OUT_DIR = path.resolve(__dirname, "out");
var DRAFT_DIR = path.resolve(__dirname, "patch-draft");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(DRAFT_DIR)) fs.mkdirSync(DRAFT_DIR, { recursive: true });
function getCPs(str) {
  return [...str].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" ");
}
var originalFsOpen = fs.promises.open;
fs.promises.open = function(filePath, flags, mode) {
  const pStr = String(filePath);
  if (pStr.includes("fonts") || pStr.includes("NotoSans")) {
    const filename = path.basename(pStr);
    const realPath = path.resolve(FONTS_DIR, filename);
    if (fs.existsSync(realPath)) {
      return originalFsOpen.call(fs.promises, realPath, flags, mode);
    }
  }
  return originalFsOpen.call(fs.promises, filePath, flags, mode);
};
var origReadFile = fs.promises.readFile;
fs.promises.readFile = function(filePath, options) {
  const pStr = String(filePath);
  if (pStr.includes("fonts") || pStr.includes("NotoSans")) {
    const filename = path.basename(pStr);
    const realPath = path.resolve(FONTS_DIR, filename);
    if (fs.existsSync(realPath)) {
      return origReadFile.call(fs.promises, realPath, options);
    }
  }
  return origReadFile.call(fs.promises, filePath, options);
};
var origFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, options) {
  const pStr = String(filePath);
  if (pStr.includes("fonts") || pStr.includes("NotoSans")) {
    const filename = path.basename(pStr);
    const realPath = path.resolve(FONTS_DIR, filename);
    if (fs.existsSync(realPath)) {
      return origFileSync.call(fs, realPath, options);
    }
  }
  return origFileSync.call(fs, filePath, options);
};
if (!globalThis.__originalFetch) {
  globalThis.__originalFetch = globalThis.fetch;
}
globalThis.fetch = async (input, options) => {
  const urlStr = typeof input === "string" ? input : input && input.url ? input.url : String(input);
  if (urlStr.toLowerCase().includes("fonts")) {
    const filename = path.basename(urlStr);
    const fontPath = path.resolve(FONTS_DIR, filename);
    if (fs.existsSync(fontPath)) {
      const fontBuffer = fs.readFileSync(fontPath);
      const ab = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => h && h.toLowerCase() === "content-type" ? "font/ttf" : null },
        arrayBuffer: async () => ab,
        text: async () => ""
      };
    } else {
      return {
        ok: false,
        status: 404,
        headers: { get: () => "text/html" },
        arrayBuffer: async () => new ArrayBuffer(0)
      };
    }
  }
  if (globalThis.__originalFetch) return globalThis.__originalFetch(input, options);
  throw new Error(`Unhandled fetch: ${urlStr}`);
};
await registerPdfFonts();
var teluguFontPath = path.resolve(FONTS_DIR, "NotoSansTelugu-Regular.ttf");
var fkTeluguFont = fontkit.openSync(teluguFontPath);
try {
  fkTeluguFont.layout("\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D");
} catch (e) {
}
function createPRNG(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
async function main() {
  console.log("================================================================================");
  console.log("STARTING PDF VERIFICATION EXPERIMENTS & TASK RUNNER");
  console.log("================================================================================");
  console.log("\n--- TASK 1a: Experiment 1b Strings with Programmatic Code Points ---");
  const exp1bStrings = [
    "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D",
    "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D ",
    "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D.",
    "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D",
    "\u0C35\u0C47\u0C35\u0C4D",
    "\u0C0F\u0C10",
    "\u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D",
    "\u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D",
    "\u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D ",
    "\u0C2A\u0C4D\u0C32\u0C3E\u0C1F\u0C4D\u200C\u0C2B\u0C3E\u0C30\u0C2E\u0C4D",
    "\u0C2A\u0C4D\u0C32\u0C3E\u0C1F\u0C4D\u200C\u0C2B\u0C3E\u0C30\u0C2E\u0C4D ",
    "\u0C32\u0C46\u0C30\u0C4D\u0C28\u0C3F\u0C02\u0C17\u0C4D",
    "\u0C2E\u0C30\u0C3F\u0C2F\u0C41"
  ];
  const exp1aResults = [];
  for (const s of exp1bStrings) {
    const cps = getCPs(s);
    let fkRes = "PASS";
    try {
      fkTeluguFont.layout(s);
    } catch (e) {
      fkRes = `CRASH (${e.message})`;
    }
    let rpRes = "PASS";
    try {
      clearEmittedRuns();
      const doc = /* @__PURE__ */ jsx6(
        ReportPdf,
        {
          workspace: { title: "WS" },
          report: {
            title: "Test",
            sections: [{ key: "sec1", title: "Sec1", content: s }]
          },
          options: { forceFont: "NotoSansTelugu" }
        }
      );
      await renderToBuffer(doc);
    } catch (e) {
      rpRes = `CRASH (${e.message})`;
    }
    exp1aResults.push({ string: s, codePoints: cps, fontkitResult: fkRes, reactPdfResult: rpRes });
  }
  console.table(exp1aResults);
  console.log("\n--- TASK 1b: Crash Rule Predicate & Sweep Coverage ---");
  const teluguConsonants = [];
  for (let code = 3093; code <= 3129; code++) {
    teluguConsonants.push(String.fromCodePoint(code));
  }
  const teluguC2List = ["\u0C30", "\u0C2E", "\u0C35", "\u0C24", "\u0C28", "\u0C2A", "\u0C32", "\u0C15", "\u0C1A", "\u0C21"];
  const teluguVowels = [""];
  for (let code = 3134; code <= 3148; code++) {
    teluguVowels.push(String.fromCodePoint(code));
  }
  const suffixes = ["", " ", ".", "\u200C"];
  const crashPredicate = (str) => /\u0C4D\u0C30/.test(str);
  let totalTested = 0;
  let totalCrashes = 0;
  let matchedAndCrashed = 0;
  let matchedButNoCrash = 0;
  let crashedButNoMatch = 0;
  const unmatchedCrashes = [];
  const crashingShapes = {};
  const allCrashingStrings = [];
  for (const c1 of teluguConsonants) {
    for (const c2 of teluguC2List) {
      const bases = [c1, `${c1}\u0C4D`, `${c1}\u0C4D${c2}`, `${c1}\u0C4D${c2}\u0C4D`];
      for (const base of bases) {
        for (const vow of teluguVowels) {
          for (const suf of suffixes) {
            const testStr = `${base}${vow}${suf}`;
            totalTested++;
            const pred = crashPredicate(testStr);
            let crashed = false;
            try {
              fkTeluguFont.layout(testStr);
            } catch (e) {
              crashed = true;
            }
            if (crashed) {
              totalCrashes++;
              allCrashingStrings.push(testStr);
              const shapeKey = `base:${c1}+virama+${c2 === "\u0C30" ? "Ra" : "C2"},vow:U+${(vow.codePointAt(0) || 0).toString(16).toUpperCase()},suf:${suf === " " ? "SPACE" : suf === "." ? "DOT" : suf === "\u200C" ? "ZWNJ" : "NONE"}`;
              crashingShapes[shapeKey] = (crashingShapes[shapeKey] || 0) + 1;
              if (pred) {
                matchedAndCrashed++;
              } else {
                crashedButNoMatch++;
                if (unmatchedCrashes.length < 20) {
                  unmatchedCrashes.push({ string: testStr, codePoints: getCPs(testStr) });
                }
              }
            } else {
              if (pred) {
                matchedButNoCrash++;
              }
            }
          }
        }
      }
    }
  }
  console.log(`Telugu Sweep Total Strings Tested: ${totalTested}`);
  console.log(`Total Crashes: ${totalCrashes}`);
  console.log(`Crashes Matching Predicate (True Positives): ${matchedAndCrashed}`);
  console.log(`Crashes NOT Matching Predicate (False Negatives): ${crashedButNoMatch}`);
  console.log(`Matching Strings That Do NOT Crash (False Positives): ${matchedButNoCrash}`);
  if (unmatchedCrashes.length > 0) {
    console.log("\nFirst 20 Unmatched Crashes:");
    console.table(unmatchedCrashes);
  }
  console.log("\n--- TASK 1c: Line 27 Fixture Pipeline Emitted Runs & Font Cmap ---");
  const fixturePath = path.resolve(ROOT_DIR, "sample-report-test.md");
  const fixtureContent = fs.readFileSync(fixturePath, "utf8");
  const rawLines = fixtureContent.split("\n");
  const line27Text = rawLines.find((l) => l.includes("Telugu Language Test"));
  console.log("Line 27 Text:", line27Text);
  clearEmittedRuns();
  try {
    const doc = /* @__PURE__ */ jsx6(
      ReportPdf,
      {
        workspace: { title: "WS" },
        report: {
          title: "Test",
          sections: [{ key: "line27", title: "Line 27", content: line27Text }]
        },
        options: {}
      }
    );
    await renderToBuffer(doc);
  } catch (e) {
    console.log("Line 27 pipeline execution caught error:", e.message);
  }
  console.log("Emitted Runs for Line 27 (LAST_EMITTED_RUNS):");
  console.log(JSON.stringify(LAST_EMITTED_RUNS, null, 2));
  const hasLatinInTeluguRun = LAST_EMITTED_RUNS.some((r) => r.fontFamily === "NotoSansTelugu" && /[A-Za-z]/.test(r.text));
  console.log("Does English text end up inside NotoSansTelugu run?", hasLatinInTeluguRun);
  console.log("Responsible function for script splitting & font assignment: `markdownToPdf` / `splitTextByScript` in client/src/shared/pdf/markdownToPdf.jsx");
  const glyphT = fkTeluguFont.glyphForCodePoint(84);
  console.log('NotoSansTelugu cmap lookup for U+0054 (Latin letter "T"):', {
    codePoint: "U+0054",
    glyphId: glyphT ? glyphT.id : null,
    glyphName: glyphT ? glyphT.name : null,
    isFallback: glyphT ? glyphT.id === 0 : true
  });
  try {
    fkTeluguFont.layout("\u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D");
  } catch (e) {
  }
  console.log("Layout Engine:", fkTeluguFont._layoutEngine);
  console.log("Layout Engine keys:", Object.keys(fkTeluguFont._layoutEngine));
  console.log("Layout Engine GPOS:", fkTeluguFont._layoutEngine.gpos, fkTeluguFont._layoutEngine.gposProcessor);
  const gpos = fkTeluguFont._layoutEngine.engine && fkTeluguFont._layoutEngine.engine.GPOSProcessor;
  const GPOSProto = gpos ? Object.getPrototypeOf(gpos) : null;
  if (!GPOSProto) throw new Error("GPOSProcessor prototype not found on layout engine.engine");
  const origGetAnchor = GPOSProto.getAnchor;
  const origApplyAnchor = GPOSProto.applyAnchor;
  function runSweepWithPatch(patchType) {
    let nullAnchorCount = 0;
    if (patchType === "Z") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          nullAnchorCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = origApplyAnchor;
    } else if (patchType === "S") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          nullAnchorCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = function(markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          nullAnchorCount++;
          return;
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
      };
    }
    let crashes = 0;
    for (const c1 of teluguConsonants) {
      for (const c2 of teluguC2List) {
        const bases = [c1, `${c1}\u0C4D`, `${c1}\u0C4D${c2}`, `${c1}\u0C4D${c2}\u0C4D`];
        for (const base of bases) {
          for (const vow of teluguVowels) {
            for (const suf of suffixes) {
              const testStr = `${base}${vow}${suf}`;
              try {
                fkTeluguFont.layout(testStr);
              } catch (e) {
                crashes++;
              }
            }
          }
        }
      }
    }
    GPOSProto.getAnchor = origGetAnchor;
    GPOSProto.applyAnchor = origApplyAnchor;
    return { crashes, nullAnchorEvents: nullAnchorCount };
  }
  const resZ = runSweepWithPatch("Z");
  console.log(`Variant Z Sweep Results: Crashes = ${resZ.crashes}, Null-Anchor Events = ${resZ.nullAnchorEvents}`);
  const resS = runSweepWithPatch("S");
  console.log(`Variant S Sweep Results: Crashes = ${resS.crashes}, Null-Anchor Events = ${resS.nullAnchorEvents}`);
  console.log("\n--- TASK 2c: Glyph Position Comparison ---");
  function getGlyphDetails(font, str, patchType) {
    if (patchType === "Z") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) return { x: 0, y: 0 };
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = origApplyAnchor;
    } else if (patchType === "S") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) return { x: 0, y: 0 };
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = function(markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) return;
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
      };
    } else {
      GPOSProto.getAnchor = origGetAnchor;
      GPOSProto.applyAnchor = origApplyAnchor;
    }
    let glyphRun = null;
    try {
      glyphRun = font.layout(str);
    } catch (e) {
      glyphRun = null;
    }
    GPOSProto.getAnchor = origGetAnchor;
    GPOSProto.applyAnchor = origApplyAnchor;
    if (!glyphRun) return null;
    return glyphRun.glyphs.map((g, i) => ({
      id: g.id,
      name: g.name,
      xAdvance: glyphRun.positions[i].xAdvance,
      xOffset: glyphRun.positions[i].xOffset,
      yOffset: glyphRun.positions[i].yOffset
    }));
  }
  const targetDrimSpace = "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D ";
  const targetDrimRef = "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C ";
  const posDrimRef = getGlyphDetails(fkTeluguFont, targetDrimRef, "NONE");
  const posDrimZ = getGlyphDetails(fkTeluguFont, targetDrimSpace, "Z");
  const posDrimS = getGlyphDetails(fkTeluguFont, targetDrimSpace, "S");
  console.log('\nPosition Comparison for "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D ":');
  console.log('Reference ("\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\\u200C "):', JSON.stringify(posDrimRef));
  console.log('Variant Z ("\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D "):  ', JSON.stringify(posDrimZ));
  console.log('Variant S ("\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D "):  ', JSON.stringify(posDrimS));
  const seed = 12345;
  const prng = createPRNG(seed);
  const sampled10 = [];
  const availableCrashes = [...allCrashingStrings];
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(prng() * availableCrashes.length);
    sampled10.push(availableCrashes[idx]);
  }
  console.log(`
Sampled 10 Crashing Strings (Seed ${seed}):`);
  const sampleComparisonResults = [];
  for (const s of sampled10) {
    const sRef = s.replace(/(\u0C4D)($|[ .])/g, "$1\u200C$2");
    const pRef = getGlyphDetails(fkTeluguFont, sRef, "NONE");
    const pZ = getGlyphDetails(fkTeluguFont, s, "Z");
    const pS = getGlyphDetails(fkTeluguFont, s, "S");
    const zMatchesRef = JSON.stringify(pZ) === JSON.stringify(pRef);
    const sMatchesRef = JSON.stringify(pS) === JSON.stringify(pRef);
    const zMatchesS = JSON.stringify(pZ) === JSON.stringify(pS);
    sampleComparisonResults.push({
      string: s,
      codePoints: getCPs(s),
      zMatchesS,
      zMatchesRef,
      sMatchesRef,
      numGlyphsZ: pZ ? pZ.length : 0
    });
  }
  console.table(sampleComparisonResults);
  console.log("\n--- TASK 3: Render PDFs for Visual Inspection ---");
  const nirmalaPath = "C:\\Windows\\Fonts\\Nirmala.ttc";
  let hasNirmala = fs.existsSync(nirmalaPath);
  if (hasNirmala) {
    Font2.register({
      family: "NirmalaUI",
      fonts: [{ src: nirmalaPath, fontWeight: "normal" }]
    });
  }
  async function renderSinglePagePdf(label, textStr, fontFamily, patchVariant, filename) {
    let eventCount = 0;
    if (patchVariant === "Z") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          eventCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = origApplyAnchor;
    } else if (patchVariant === "S") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          eventCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = function(markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          eventCount++;
          return;
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
      };
    } else {
      GPOSProto.getAnchor = origGetAnchor;
      GPOSProto.applyAnchor = origApplyAnchor;
    }
    const doc = /* @__PURE__ */ jsx6(
      ReportPdf,
      {
        workspace: { title: "WS" },
        report: {
          title: label,
          sections: [
            {
              key: "sec1",
              title: label,
              content: textStr
            }
          ]
        },
        options: { forceFont: fontFamily }
      }
    );
    try {
      const buffer = await renderToBuffer(doc);
      const outPath = path.resolve(OUT_DIR, filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Rendered ${filename} (${buffer.length} bytes, Patch: ${patchVariant || "NONE"}, Interceptions: ${eventCount})`);
    } catch (e) {
      console.log(`Failed to render ${filename} (Patch: ${patchVariant || "NONE"}): ${e.message}`);
    } finally {
      GPOSProto.getAnchor = origGetAnchor;
      GPOSProto.applyAnchor = origApplyAnchor;
    }
  }
  await renderSinglePagePdf("Label: drim-ref", "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D", "NotoSansTelugu", null, "drim-ref.pdf");
  await renderSinglePagePdf("Label: drim-z", "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D", "NotoSansTelugu", "Z", "drim-z.pdf");
  await renderSinglePagePdf("Label: drim-s", "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D", "NotoSansTelugu", "S", "drim-s.pdf");
  if (hasNirmala) {
    await renderSinglePagePdf("Label: drim-nirmala", "\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D \u0C35\u0C47\u0C35\u0C4D", "NirmalaUI", null, "drim-nirmala.pdf");
  }
  async function renderFullFixturePdf(patchVariant, filename) {
    let eventCount = 0;
    if (patchVariant === "Z") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          eventCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = origApplyAnchor;
    } else if (patchVariant === "S") {
      GPOSProto.getAnchor = function(anchor) {
        if (!anchor) {
          eventCount++;
          return { x: 0, y: 0 };
        }
        return origGetAnchor.call(this, anchor);
      };
      GPOSProto.applyAnchor = function(markRecord, baseAnchor, baseGlyphIndex) {
        if (!baseAnchor || !markRecord || !markRecord.markAnchor) {
          eventCount++;
          return;
        }
        return origApplyAnchor.call(this, markRecord, baseAnchor, baseGlyphIndex);
      };
    }
    const doc = /* @__PURE__ */ jsx6(
      ReportPdf,
      {
        workspace: { title: "FULL FIXTURE" },
        report: {
          title: "Full Fixture Report",
          sections: [
            {
              key: "sec-full",
              title: "Full Markdown Fixture",
              content: fixtureContent
            }
          ]
        },
        options: {}
      }
    );
    try {
      const buffer = await renderToBuffer(doc);
      const outPath = path.resolve(OUT_DIR, filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Rendered ${filename} (${buffer.length} bytes, Patch: ${patchVariant}, Interceptions: ${eventCount})`);
    } catch (e) {
      console.log(`Failed to render ${filename} (Patch: ${patchVariant}): ${e.message}`);
    } finally {
      GPOSProto.getAnchor = origGetAnchor;
      GPOSProto.applyAnchor = origApplyAnchor;
    }
  }
  await renderFullFixturePdf("Z", "full-fixture-Z.pdf");
  await renderFullFixturePdf("S", "full-fixture-S.pdf");
  console.log("\n--- TASK 4: Verify Every PDF with pdfjs-dist ---");
  const pdfFiles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".pdf"));
  const task4Table = [];
  for (const f of pdfFiles) {
    const filePath = path.resolve(OUT_DIR, f);
    const stat = fs.statSync(filePath);
    const buffer = fs.readFileSync(filePath);
    const data = new Uint8Array(buffer);
    let pageCount = 0;
    let textContentStr = "";
    const fontNamesSet = /* @__PURE__ */ new Set();
    try {
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdfDoc = await loadingTask.promise;
      pageCount = pdfDoc.numPages;
      for (let p = 1; p <= pageCount; p++) {
        const page = await pdfDoc.getPage(p);
        const tc = await page.getTextContent();
        const pageText = tc.items.map((item) => item.str).join(" ");
        textContentStr += pageText + " ";
        const opList = await page.getOperatorList();
        for (let i = 0; i < opList.fnArray.length; i++) {
          if (opList.fnArray[i] === pdfjsLib.OPS.setFont) {
            const fontName = opList.argsArray[i][0];
            fontNamesSet.add(fontName);
          }
        }
      }
    } catch (e) {
      textContentStr = `ERROR: ${e.message}`;
    }
    const hasPerfMetrics = textContentStr.includes("Performance Metrics");
    const hasActionPlan = textContentStr.includes("Action Plan");
    task4Table.push({
      file: f,
      sizeBytes: stat.size,
      pages: pageCount,
      textLength: textContentStr.length,
      hasPerfMetrics,
      hasActionPlan,
      fonts: Array.from(fontNamesSet).join(", ")
    });
  }
  console.table(task4Table);
  console.log("\n--- TASK 5: Creating Patch Draft File ---");
  const draftPatchContent = `--- node_modules/fontkit/dist/module.mjs
+++ node_modules/fontkit/dist/module.mjs
@@ -9949,3 +9949,6 @@
     getAnchor(anchor) {
+        if (!anchor) {
+            return { x: 0, y: 0 };
+        }
         // TODO: contour point, device tables
         let x = anchor.xCoordinate;
`;
  const draftPatchPath = path.resolve(DRAFT_DIR, "fontkit+2.0.4.patch");
  fs.writeFileSync(draftPatchPath, draftPatchContent);
  console.log(`Saved DRAFT patch file to: ${draftPatchPath}`);
  console.log("\n================================================================================");
  console.log("ALL EXPERIMENTS AND TASKS COMPLETED SUCCESSFULLY");
  console.log("================================================================================");
}
main().catch((err) => {
  console.error("FATAL TASK RUNNER ERROR:", err);
  process.exit(1);
});
