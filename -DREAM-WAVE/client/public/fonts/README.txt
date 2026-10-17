DREAM WAVE PDF Font Assets
===========================

To enable high-fidelity PDF rendering and full Indic script support (Telugu and Devanagari/Hindi), place the following FIVE static TrueType Font (.ttf) files into this directory (`client/public/fonts/`):

1. NotoSans-Regular.ttf
   - Source: Google Fonts (Noto Sans)
   - URL: https://fonts.google.com/specimen/Noto+Sans

2. NotoSans-Bold.ttf
   - Source: Google Fonts (Noto Sans - Bold weight)
   - URL: https://fonts.google.com/specimen/Noto+Sans

3. NotoSans-Italic.ttf
   - Source: Google Fonts (Noto Sans - Italic style)
   - URL: https://fonts.google.com/specimen/Noto+Sans

4. NotoSansDevanagari-Regular.ttf
   - Source: Google Fonts (Noto Sans Devanagari)
   - URL: https://fonts.google.com/specimen/Noto+Sans+Devanagari

5. NotoSansTelugu-Regular.ttf
   - Source: Google Fonts (Noto Sans Telugu)
   - URL: https://fonts.google.com/specimen/Noto+Sans+Telugu

CRITICAL REQUIREMENTS:
- Use STATIC .ttf files ONLY (do NOT use .woff, .woff2, or variable font files like NotoSans-VF.ttf).
- Ensure file names match the exact casing listed above.
- If any font file is missing, the PDF engine gracefully falls back to Helvetica or safe-mode rendering with "?" placeholder glyphs to prevent layout engine crashes.
