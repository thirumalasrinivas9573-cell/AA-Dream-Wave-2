import { StyleSheet } from '@react-pdf/renderer'
import { PDF_FONT_FAMILY } from './fonts'

export const colors = {
  primary: '#4C1D95',
  primaryLight: '#8B5CF6',
  primaryBg: '#F5F3FF',
  textDark: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  dangerBg: '#FEF2F2',
  dangerBorder: '#EF4444',
  dangerText: '#991B1B',
  successBg: '#ECFDF5',
  successBorder: '#10B981',
  successText: '#065F46',
  warningBg: '#FFFBEB',
  warningBorder: '#F59E0B',
  warningText: '#92400E',
}

export function createPdfStyles(fontFamily = PDF_FONT_FAMILY) {
  return StyleSheet.create({
    page: {
      size: 'A4',
      paddingTop: 45,
      paddingBottom: 50,
      paddingHorizontal: 40,
      fontFamily,
      backgroundColor: '#FFFFFF',
    },
    header: {
      position: 'absolute',
      top: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      borderBottomStyle: 'solid',
      paddingBottom: 4,
    },
    headerTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: colors.primaryLight,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    headerSubtitle: {
      fontSize: 7.5,
      color: colors.textMuted,
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderTopStyle: 'solid',
      paddingTop: 6,
    },
    footerText: {
      fontSize: 7.5,
      color: colors.textLight,
    },
    pageNumber: {
      fontSize: 7.5,
      color: colors.textMuted,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 14,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      borderBottomStyle: 'solid',
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 6,
    },
    sectionKey: {
      fontSize: 8,
      fontWeight: 'bold',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    keyValueRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 3,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight,
    },
    keyLabel: {
      fontSize: 9,
      color: colors.textMuted,
      fontWeight: 'bold',
    },
    keyValue: {
      fontSize: 9,
      color: colors.textDark,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 4,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 10,
      fontSize: 9.5,
      color: colors.primaryLight,
    },
    bulletText: {
      flex: 1,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: colors.textDark,
    },
    table: {
      marginVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    tableHeaderRow: {
      backgroundColor: '#F3F4F6',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableCell: {
      flex: 1,
      fontSize: 8.5,
      color: colors.textDark,
    },
    tableHeaderCell: {
      fontSize: 8.5,
      fontWeight: 'bold',
      color: colors.primary,
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: '#E5E7EB',
      borderRadius: 3,
      overflow: 'hidden',
      marginVertical: 4,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primaryLight,
    },
    badge: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: colors.textMuted,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3,
    },
  })
}

let cachedStyles = null
let cachedFontFamily = null

/**
 * Returns a cached StyleSheet created after registerPdfFonts() has resolved.
 */
export function getPdfStyles() {
  if (!cachedStyles || cachedFontFamily !== PDF_FONT_FAMILY) {
    cachedStyles = createPdfStyles(PDF_FONT_FAMILY)
    cachedFontFamily = PDF_FONT_FAMILY
  }
  return cachedStyles
}

export default getPdfStyles


