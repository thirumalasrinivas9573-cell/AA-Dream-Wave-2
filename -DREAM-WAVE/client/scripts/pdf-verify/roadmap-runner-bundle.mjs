var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

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
  "../../src/shared/pdf/fonts.js"() {
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

// ../../src/shared/pdf/fontkitGuard.js
function warnOnce(msg) {
  if (warnCount === 0) {
    warnCount++;
    console.warn(`[FontkitGuard] ${msg}`);
  }
}
function getGuardStats() {
  return { installed: isInstalled, hits: hitCount, variant: variantType };
}
async function installFontkitGuard({ fontData } = {}) {
  if (isInstalled) {
    return { installed: true, hits: hitCount, variant: variantType };
  }
  try {
    const fontkitModule = await import("fontkit");
    const fontkit = fontkitModule.default || fontkitModule;
    if (!fontkit || typeof fontkit.create !== "function") {
      warnOnce("fontkit module could not be imported or lacks create method.");
      return { installed: false, hits: hitCount, variant: variantType };
    }
    let fontBuffer = fontData;
    if (!fontBuffer) {
      if (typeof window !== "undefined" && typeof window.fetch === "function") {
        try {
          const resp = await fetch("/fonts/NotoSansTelugu-Regular.ttf");
          if (resp && resp.ok) {
            const ab = await resp.arrayBuffer();
            fontBuffer = new Uint8Array(ab);
          }
        } catch {
        }
      }
    }
    if (!fontBuffer) {
      warnOnce("Unable to obtain sample font data to hook GPOSProcessor prototype.");
      return { installed: false, hits: hitCount, variant: variantType };
    }
    let sampleFont = null;
    try {
      sampleFont = fontkit.create(fontBuffer);
      sampleFont.layout("\u0C17\u0C48\u0C21\u0C46\u0C28\u0C4D\u0C38\u0C4D");
    } catch {
    }
    const engine = sampleFont && sampleFont._layoutEngine && sampleFont._layoutEngine.engine;
    const gposProcessor = engine && engine.GPOSProcessor;
    const GPOSProto = gposProcessor ? Object.getPrototypeOf(gposProcessor) : null;
    if (!GPOSProto || typeof GPOSProto.getAnchor !== "function") {
      warnOnce("GPOSProcessor prototype not found on layout engine.");
      return { installed: false, hits: hitCount, variant: variantType };
    }
    if (GPOSProto[GUARD_SYMBOL]) {
      isInstalled = true;
      return { installed: true, hits: hitCount, variant: variantType };
    }
    const origGetAnchor = GPOSProto.getAnchor;
    GPOSProto.getAnchor = function(anchor) {
      if (!anchor) {
        hitCount++;
        return { x: 0, y: 0 };
      }
      return origGetAnchor.call(this, anchor);
    };
    Object.defineProperty(GPOSProto, GUARD_SYMBOL, {
      value: true,
      configurable: false,
      writable: false,
      enumerable: false
    });
    isInstalled = true;
    return { installed: true, hits: hitCount, variant: variantType };
  } catch (err) {
    warnOnce(`Unexpected failure during installation: ${err && err.message ? err.message : String(err)}`);
    return { installed: false, hits: hitCount, variant: variantType };
  }
}
var GUARD_MARKER, GUARD_SYMBOL, isInstalled, hitCount, variantType, warnCount;
var init_fontkitGuard = __esm({
  "../../src/shared/pdf/fontkitGuard.js"() {
    "use strict";
    GUARD_MARKER = "__dwFontkitGuard";
    GUARD_SYMBOL = Symbol.for(GUARD_MARKER);
    isInstalled = false;
    hitCount = 0;
    variantType = "Z";
    warnCount = 0;
  }
});

// roadmap-runner.jsx
import React from "react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { renderToBuffer } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ../../src/modules/student/pages/RoadmapPdf.jsx
import { Text as Text4, View as View4, StyleSheet as StyleSheet3 } from "@react-pdf/renderer";

// ../../src/shared/pdf/PdfDocument.jsx
import { Document, Page, Text, View } from "@react-pdf/renderer";

// ../../src/shared/pdf/pdfStyles.js
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

// ../../src/shared/pdf/PdfDocument.jsx
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

// ../../src/shared/pdf/markdownToPdf.jsx
import { Text as Text3, View as View3, StyleSheet as StyleSheet2 } from "@react-pdf/renderer";

// ../../src/shared/pdf/pdfComponents.jsx
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
function KeyValueRow({ label, value, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ jsxs2(View2, { style: styles.keyValueRow, children: [
    /* @__PURE__ */ jsx2(Text2, { style: styles.keyLabel, children: renderTextSegments(label, options, "kvlbl") }),
    /* @__PURE__ */ jsx2(Text2, { style: styles.keyValue, children: renderTextSegments(value, options, "kvval") })
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
function ProgressBar({ percent = 0, color = colors.primaryLight }) {
  const styles = getPdfStyles();
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0));
  return /* @__PURE__ */ jsx2(View2, { style: styles.progressBarTrack, children: /* @__PURE__ */ jsx2(View2, { style: [styles.progressBarFill, { width: `${clamped}%`, backgroundColor: color }] }) });
}
function Badge({ children, style = {}, options = {} }) {
  const styles = getPdfStyles();
  return /* @__PURE__ */ jsx2(Text2, { style: [styles.badge, style], children: renderTextSegments(children, options, "bdg") });
}

// ../../src/shared/pdf/markdownToPdf.jsx
init_fonts();
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";

// ../../src/shared/pdf/index.js
init_fonts();

// ../../src/shared/hooks/usePdfExport.js
import { useCallback, useState } from "react";

// ../../src/shared/components/DownloadPdfButton.jsx
import { jsx as jsx4 } from "react/jsx-runtime";

// ../../src/modules/student/pages/RoadmapPdf.jsx
import { Fragment, jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function formatDate(raw) {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function getCustomStyles() {
  return StyleSheet3.create({
    headerContainer: {
      marginBottom: 14,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primaryLight,
      borderBottomStyle: "solid",
      paddingBottom: 10
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 4
    },
    roadmapTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary
    },
    goalSubtitle: {
      fontSize: 9.5,
      color: colors.textMuted,
      marginBottom: 4
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4
    },
    overviewCard: {
      backgroundColor: colors.primaryBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryLight,
      borderLeftStyle: "solid",
      padding: 8,
      borderRadius: 4,
      marginBottom: 10
    },
    overviewHeading: {
      fontSize: 10,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 3
    },
    overviewText: {
      fontSize: 9,
      lineHeight: 1.4,
      color: colors.textDark
    },
    stageCard: {
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight
    },
    stageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4
    },
    stageTitle: {
      fontSize: 10.5,
      fontWeight: "bold",
      color: colors.textDark,
      flex: 1,
      marginRight: 8
    },
    stageMeta: {
      fontSize: 8.5,
      color: colors.textMuted
    },
    stageDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: colors.textDark,
      marginTop: 3,
      marginBottom: 4
    },
    stageSkills: {
      fontSize: 8,
      color: colors.primaryLight,
      marginTop: 2
    },
    stageDate: {
      fontSize: 8,
      color: colors.textLight,
      marginTop: 1
    },
    weeklyGroup: {
      marginBottom: 8,
      paddingBottom: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight
    },
    weeklyGroupHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 3
    },
    weeklyGroupTitle: {
      fontSize: 9.5,
      fontWeight: "bold",
      color: colors.primary
    },
    weeklyGroupMeta: {
      fontSize: 8,
      color: colors.textMuted
    },
    weeklyOutcomesLabel: {
      fontSize: 8,
      fontWeight: "bold",
      color: colors.textLight,
      marginTop: 2,
      marginBottom: 2,
      textTransform: "uppercase"
    },
    projectCard: {
      marginBottom: 8,
      padding: 8,
      backgroundColor: "#FAFAFA",
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: colors.border
    },
    projectTitle: {
      fontSize: 9.5,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 2
    },
    projectDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: colors.textDark,
      marginBottom: 3
    },
    projectSkills: {
      fontSize: 8,
      color: colors.textMuted
    },
    projectStatus: {
      fontSize: 8,
      color: colors.textLight,
      marginTop: 2
    },
    emptyNotice: {
      fontSize: 8.5,
      fontStyle: "italic",
      color: colors.textMuted,
      marginVertical: 4
    }
  });
}
function RoadmapPdf({ roadmap = {}, goal = {}, options = {} }) {
  getPdfStyles();
  const customStyles = getCustomStyles();
  const rawTitle = roadmap.title || (goal?.title ? `${goal.title} Roadmap` : "") || roadmap.data?.title || "Learning Roadmap";
  const isPrimary = Boolean(roadmap.isPrimary || goal?.isPrimary || roadmap.data?.isPrimary);
  const goalCategory = goal?.category || "";
  const goalDescription = goal?.description || roadmap.data?.overview || "";
  const formattedDate = formatDate(roadmap.updatedAt || roadmap.createdAt || roadmap.architecture?.generatedAt || /* @__PURE__ */ new Date());
  const estimatedDate = formatDate(roadmap.architecture?.estimatedCompletion || goal?.deadline);
  const percentProgress = roadmap.progress?.percent ?? goal?.progress ?? 0;
  const learningStages = Array.isArray(roadmap.learningStages) ? [...roadmap.learningStages] : [];
  learningStages.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const rawWeeklyPlans = Array.isArray(roadmap.weeklyPlans) ? [...roadmap.weeklyPlans] : [];
  rawWeeklyPlans.sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0));
  const weeklyPlansByWeek = /* @__PURE__ */ new Map();
  for (const plan of rawWeeklyPlans) {
    const w = Number(plan.week) || 1;
    if (!weeklyPlansByWeek.has(w)) {
      weeklyPlansByWeek.set(w, []);
    }
    weeklyPlansByWeek.get(w).push(plan);
  }
  const weeklyWeekEntries = [...weeklyPlansByWeek.entries()].sort((a, b) => a[0] - b[0]);
  const weeklyTableHeaders = ["Week", "Focus", "Study Hours", "Status"];
  const weeklyTableRows = rawWeeklyPlans.map((plan, idx) => [
    `Week ${plan.week || idx + 1}`,
    plan.focus || "General study",
    `${plan.studyHours || 0} hrs`,
    plan.completed ? "Completed" : "Pending"
  ]);
  const practiceProjects = Array.isArray(roadmap.practiceProjects) ? roadmap.practiceProjects : [];
  return /* @__PURE__ */ jsxs4(PdfDocument, { title: sanitizeEmojiAndText(rawTitle, options), author: "Dream Wave AI", children: [
    /* @__PURE__ */ jsxs4(View4, { style: customStyles.headerContainer, wrap: false, children: [
      /* @__PURE__ */ jsxs4(View4, { style: customStyles.titleRow, children: [
        /* @__PURE__ */ jsx5(Text4, { style: customStyles.roadmapTitle, children: renderTextSegments(rawTitle, options, "rm-title") }),
        isPrimary ? /* @__PURE__ */ jsx5(Badge, { style: { backgroundColor: colors.primaryBg, color: colors.primary }, options, children: "Primary" }) : null
      ] }),
      goal?.title && goal.title !== rawTitle ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.goalSubtitle, children: renderTextSegments(`Goal: ${goal.title}`, options, "rm-goal") }) : null,
      /* @__PURE__ */ jsxs4(View4, { style: customStyles.badgeRow, children: [
        formattedDate ? /* @__PURE__ */ jsx5(Badge, { options, children: `Date: ${formattedDate}` }) : null,
        goalCategory ? /* @__PURE__ */ jsx5(Badge, { options, children: goalCategory }) : null,
        estimatedDate ? /* @__PURE__ */ jsx5(Badge, { options, children: `Target: ${estimatedDate}` }) : null,
        /* @__PURE__ */ jsx5(Badge, { options, children: `Progress: ${percentProgress}%` })
      ] })
    ] }),
    /* @__PURE__ */ jsxs4(Section, { title: "Roadmap Overview", options, wrap: false, children: [
      goalDescription ? /* @__PURE__ */ jsxs4(View4, { style: customStyles.overviewCard, children: [
        /* @__PURE__ */ jsx5(Text4, { style: customStyles.overviewHeading, children: renderTextSegments("Overview", options, "rm-ov-h") }),
        /* @__PURE__ */ jsx5(Text4, { style: customStyles.overviewText, children: renderTextSegments(goalDescription, options, "rm-desc") })
      ] }) : null,
      /* @__PURE__ */ jsx5(KeyValueRow, { label: "Overall Completion", value: `${percentProgress}%`, options }),
      /* @__PURE__ */ jsx5(KeyValueRow, { label: "Learning Stages", value: String(learningStages.length), options }),
      /* @__PURE__ */ jsx5(KeyValueRow, { label: "Weekly Plans", value: String(rawWeeklyPlans.length), options }),
      /* @__PURE__ */ jsx5(KeyValueRow, { label: "Practice Projects", value: String(practiceProjects.length), options })
    ] }),
    /* @__PURE__ */ jsx5(Section, { title: "Learning Stages", options, wrap: true, children: learningStages.length > 0 ? learningStages.map((stage, idx) => {
      const stageOrder = stage.order || idx + 1;
      const stageTitle = stage.title || `Stage ${stageOrder}`;
      const stageStatus = stage.status || "available";
      const stageProgress = Number(stage.progress) || 0;
      const stageTargetDate = formatDate(stage.targetDate);
      const stageSkills = Array.isArray(stage.skills) ? stage.skills.filter(Boolean) : [];
      return /* @__PURE__ */ jsxs4(View4, { style: customStyles.stageCard, wrap: false, children: [
        /* @__PURE__ */ jsxs4(View4, { style: customStyles.stageHeader, children: [
          /* @__PURE__ */ jsx5(Text4, { style: customStyles.stageTitle, children: renderTextSegments(`${stageOrder}. ${stageTitle}`, options, `stg-ttl-${idx}`) }),
          /* @__PURE__ */ jsx5(Text4, { style: customStyles.stageMeta, children: renderTextSegments(`${stageStatus} \xB7 ${stageProgress}%`, options, `stg-meta-${idx}`) })
        ] }),
        /* @__PURE__ */ jsx5(ProgressBar, { percent: stageProgress }),
        stage.description ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.stageDesc, children: renderTextSegments(stage.description, options, `stg-desc-${idx}`) }) : null,
        stageSkills.length > 0 ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.stageSkills, children: renderTextSegments(`Skills: ${stageSkills.join(", ")}`, options, `stg-skl-${idx}`) }) : null,
        stageTargetDate ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.stageDate, children: renderTextSegments(`Target: ${stageTargetDate}`, options, `stg-dt-${idx}`) }) : null
      ] }, stage._id || `stage-${idx}`);
    }) : /* @__PURE__ */ jsx5(Text4, { style: customStyles.emptyNotice, children: renderTextSegments("No learning stages defined for this roadmap.", options, "empty-stages") }) }),
    /* @__PURE__ */ jsx5(Section, { title: "Weekly Plans", options, wrap: true, children: rawWeeklyPlans.length > 0 ? /* @__PURE__ */ jsxs4(Fragment, { children: [
      /* @__PURE__ */ jsx5(Table, { headers: weeklyTableHeaders, rows: weeklyTableRows, options }),
      weeklyWeekEntries.map(([weekNum, plans]) => {
        const allOutcomes = plans.flatMap((p) => Array.isArray(p.outcomes) ? p.outcomes.filter(Boolean) : []);
        return /* @__PURE__ */ jsxs4(View4, { style: customStyles.weeklyGroup, wrap: false, children: [
          /* @__PURE__ */ jsxs4(View4, { style: customStyles.weeklyGroupHeader, children: [
            /* @__PURE__ */ jsx5(Text4, { style: customStyles.weeklyGroupTitle, children: renderTextSegments(`Week ${weekNum}: ${plans.map((p) => p.focus).filter(Boolean).join(" / ") || "Scheduled Plan"}`, options, `wk-ttl-${weekNum}`) }),
            /* @__PURE__ */ jsx5(Text4, { style: customStyles.weeklyGroupMeta, children: renderTextSegments(`${plans.reduce((sum, p) => sum + (Number(p.studyHours) || 0), 0)} study hours`, options, `wk-hrs-${weekNum}`) })
          ] }),
          allOutcomes.length > 0 ? /* @__PURE__ */ jsxs4(Fragment, { children: [
            /* @__PURE__ */ jsx5(Text4, { style: customStyles.weeklyOutcomesLabel, children: renderTextSegments("Target Outcomes:", options, `wk-out-lbl-${weekNum}`) }),
            /* @__PURE__ */ jsx5(BulletList, { items: allOutcomes, options })
          ] }) : null
        ] }, `wk-group-${weekNum}`);
      })
    ] }) : /* @__PURE__ */ jsx5(Text4, { style: customStyles.emptyNotice, children: renderTextSegments("No weekly plans defined for this roadmap.", options, "empty-weekly") }) }),
    /* @__PURE__ */ jsx5(Section, { title: "Practice Projects", options, wrap: true, children: practiceProjects.length > 0 ? practiceProjects.map((proj, idx) => {
      const projTitle = proj.title || `Project ${idx + 1}`;
      const projSkills = Array.isArray(proj.skills) ? proj.skills.filter(Boolean) : [];
      const projStatus = proj.status || "planned";
      return /* @__PURE__ */ jsxs4(View4, { style: customStyles.projectCard, wrap: false, children: [
        /* @__PURE__ */ jsx5(Text4, { style: customStyles.projectTitle, children: renderTextSegments(projTitle, options, `prj-ttl-${idx}`) }),
        proj.description ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.projectDesc, children: renderTextSegments(proj.description, options, `prj-dsc-${idx}`) }) : null,
        projSkills.length > 0 ? /* @__PURE__ */ jsx5(Text4, { style: customStyles.projectSkills, children: renderTextSegments(`Skills: ${projSkills.join(", ")}`, options, `prj-skl-${idx}`) }) : null,
        /* @__PURE__ */ jsx5(Text4, { style: customStyles.projectStatus, children: renderTextSegments(`Status: ${projStatus}`, options, `prj-st-${idx}`) })
      ] }, proj._id || `proj-${idx}`);
    }) : /* @__PURE__ */ jsx5(Text4, { style: customStyles.emptyNotice, children: renderTextSegments("No practice projects defined for this roadmap.", options, "empty-projects") }) })
  ] });
}

// roadmap-runner.jsx
init_fonts();
init_fontkitGuard();
import { jsx as jsx6 } from "react/jsx-runtime";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var CLIENT_DIR = path.resolve(__dirname, "../..");
var FONTS_DIR = path.resolve(CLIENT_DIR, "public/fonts");
var OUT_DIR = path.resolve(__dirname, "out");
var CLIENT_OUT_DIR = path.resolve(CLIENT_DIR, "out");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(CLIENT_OUT_DIR)) fs.mkdirSync(CLIENT_OUT_DIR, { recursive: true });
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
    }
  }
  if (globalThis.__originalFetch) return globalThis.__originalFetch(input, options);
  throw new Error(`Unhandled fetch: ${urlStr}`);
};
await registerPdfFonts();
var teluguFontPath = path.resolve(FONTS_DIR, "NotoSansTelugu-Regular.ttf");
var teluguFontBuffer = fs.readFileSync(teluguFontPath);
await installFontkitGuard({ fontData: teluguFontBuffer });
var teluguRaVattuWord = "\u0C2A\u0C4D\u0C30\u0C3E\u0C1C\u0C46\u0C15\u0C4D\u0C1F\u0C4D";
var testGoal = {
  _id: "goal-telugu-101",
  title: `\u0C35\u0C46\u0C2C\u0C4D \u0C21\u0C46\u0C35\u0C32\u0C2A\u0C4D\u200C\u0C2E\u0C46\u0C02\u0C1F\u0C4D ${teluguRaVattuWord} \u0C30\u0C4B\u0C21\u0C4D\u200C\u0C2E\u0C4D\u0C2F\u0C3E\u0C2A\u0C4D`,
  category: "Technical Skill",
  priority: "High",
  progress: 45,
  isPrimary: true,
  description: "\u0C32\u0C30\u0C4D\u0C28\u0C3F\u0C02\u0C17\u0C4D \u0C1C\u0C30\u0C4D\u0C28\u0C40 \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C15\u0C46\u0C30\u0C40\u0C30\u0C4D \u0C17\u0C4D\u0C30\u0C4B\u0C24\u0C4D \u0C15\u0C4B\u0C38\u0C02 \u0C06\u0C30\u0C4D\u0C15\u0C3F\u0C1F\u0C46\u0C15\u0C4D\u0C1A\u0C30\u0C4D.",
  deadline: "2026-12-31"
};
var testRoadmap = {
  _id: "roadmap-fixture-101",
  title: `\u0C35\u0C46\u0C2C\u0C4D \u0C06\u0C30\u0C4D\u0C15\u0C3F\u0C1F\u0C46\u0C15\u0C4D\u0C1A\u0C30\u0C4D ${teluguRaVattuWord}`,
  isPrimary: true,
  status: "active",
  progress: { percent: 45 },
  learningStages: [
    {
      order: 1,
      title: `\u0C2B\u0C4D\u0C30\u0C02\u0C1F\u0C4D\u200C\u0C0E\u0C02\u0C21\u0C4D \u0C2C\u0C47\u0C38\u0C3F\u0C15\u0C4D\u0C38\u0C4D \u0C2E\u0C30\u0C3F\u0C2F\u0C41 ${teluguRaVattuWord} \u0C2A\u0C4D\u0C30\u0C23\u0C3E\u0C33\u0C3F\u0C15`,
      description: "\u0C08 \u0C26\u0C36\u0C32\u0C4B HTML, CSS \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C2A\u0C4D\u0C30\u0C3E\u0C25\u0C2E\u0C3F\u0C15 \u0C2D\u0C3E\u0C35\u0C28\u0C32\u0C41 \u0C28\u0C47\u0C30\u0C4D\u0C1A\u0C41\u0C15\u0C41\u0C02\u0C1F\u0C3E\u0C30\u0C41.",
      status: "completed",
      progress: 100,
      skills: ["HTML5", "CSS3", "JavaScript"]
    },
    {
      order: 2,
      title: `\u0C30\u0C3F\u0C2F\u0C3E\u0C15\u0C4D\u0C1F\u0C4D \u0C05\u0C21\u0C4D\u0C35\u0C3E\u0C28\u0C4D\u0C38\u0C4D\u200C\u0C21\u0C4D ${teluguRaVattuWord} \u0C28\u0C3F\u0C30\u0C4D\u0C2E\u0C3E\u0C23\u0C02`,
      description: "\u092F\u0939 \u090F\u0915 \u0935\u094D\u092F\u093E\u092A\u0915 \u0930\u094B\u0921\u092E\u0948\u092A \u0935\u093F\u0935\u0930\u0923 \u0939\u0948 \u091C\u093F\u0938\u092E\u0947\u0902 \u0938\u092D\u0940 \u091A\u0930\u0923 \u0914\u0930 \u092F\u094B\u091C\u0928\u093E\u090F\u0902 \u0936\u093E\u092E\u093F\u0932 \u0939\u0948\u0902\u0964",
      status: "in-progress",
      progress: 60,
      skills: ["React", "State Management"]
    },
    {
      order: 3,
      title: `\u0C38\u0C3F\u0C38\u0C4D\u0C1F\u0C2E\u0C4D \u0C1F\u0C46\u0C38\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C4D \u0C2E\u0C30\u0C3F\u0C2F\u0C41 \u0C21\u0C3F\u0C2A\u0C4D\u0C32\u0C3E\u0C2F\u0C4D\u200C\u0C2E\u0C46\u0C02\u0C1F\u0C4D ${teluguRaVattuWord}`,
      description: "",
      // stage with no description
      status: "available",
      progress: 0,
      skills: ["Docker", "CI/CD"]
    }
  ],
  weeklyPlans: [],
  // empty weeklyPlans
  practiceProjects: [
    {
      title: `\u0C21\u0C4D\u0C30\u0C40\u0C2E\u0C4D\u200C\u0C35\u0C47\u0C35\u0C4D \u0C2A\u0C4B\u0C30\u0C4D\u0C1F\u0C4D\u200C\u0C2B\u0C4B\u0C32\u0C3F\u0C2F\u0C4B ${teluguRaVattuWord}`,
      description: "\u0C2A\u0C42\u0C30\u0C4D\u0C24\u0C3F \u0C38\u0C4D\u0C25\u0C3E\u0C2F\u0C3F \u0C05\u0C2A\u0C4D\u0C32\u0C3F\u0C15\u0C47\u0C37\u0C28\u0C4D \u0C28\u0C3F\u0C30\u0C4D\u0C2E\u0C3E\u0C23\u0C02.",
      skills: ["React", "Node.js"],
      status: "in-progress"
    },
    {
      title: "Project Without Skills",
      description: "Testing edge case where skills array is empty or undefined.",
      skills: [],
      // project without skills
      status: "planned"
    }
  ]
};
async function main() {
  console.log("================================================================================");
  console.log("RUNNING ROADMAP PDF VERIFICATION HARNESS");
  console.log("================================================================================");
  const hitsBefore = getGuardStats().hits;
  let status = "PASS";
  let buffer = null;
  const outPath = path.resolve(OUT_DIR, "roadmap-fixture.pdf");
  const clientOutPath = path.resolve(CLIENT_OUT_DIR, "roadmap-fixture.pdf");
  const doc = /* @__PURE__ */ jsx6(RoadmapPdf, { roadmap: testRoadmap, goal: testGoal, options: {} });
  try {
    buffer = await renderToBuffer(doc);
    fs.writeFileSync(outPath, buffer);
    fs.writeFileSync(clientOutPath, buffer);
  } catch (err) {
    status = `CRASH (${err.message})`;
  }
  const hitsAfter = getGuardStats().hits;
  const guardHits = hitsAfter - hitsBefore;
  let pageCount = 0;
  let textContentStr = "";
  let teluguCharCount = 0;
  if (buffer) {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdfDoc = await loadingTask.promise;
      pageCount = pdfDoc.numPages;
      for (let p = 1; p <= pageCount; p++) {
        const page = await pdfDoc.getPage(p);
        const tc = await page.getTextContent();
        const pageText = tc.items.map((item) => item.str).join(" ");
        textContentStr += pageText + " ";
      }
      for (const char of textContentStr) {
        const code = char.codePointAt(0);
        if (code >= 3072 && code <= 3199) {
          teluguCharCount++;
        }
      }
    } catch (err) {
      textContentStr = `ERROR: ${err.message}`;
    }
  }
  const summary = {
    case: "roadmap-fixture",
    result: status,
    bytes: buffer ? buffer.length : 0,
    pages: pageCount,
    guardHits,
    textLength: textContentStr.length,
    teluguCharsInU0C00_U0C7F: teluguCharCount
  };
  console.log("\n--- ROADMAP PDF VERIFICATION RESULT ---");
  console.table([summary]);
  console.log("Result:", summary.result);
  console.log("Bytes:", summary.bytes);
  console.log("Pages:", summary.pages);
  console.log("Guard Hits:", summary.guardHits);
  console.log("pdfjs-extracted Text Length:", summary.textLength);
  console.log("Characters in U+0C00..U+0C7F (Telugu):", summary.teluguCharsInU0C00_U0C7F);
  console.log("Saved to:", outPath);
  console.log("Also saved to:", clientOutPath);
  console.log("================================================================================");
  if (status !== "PASS") {
    process.exit(1);
  }
}
main().catch((err) => {
  console.error("FATAL ROADMAP HARNESS ERROR:", err);
  process.exit(1);
});
