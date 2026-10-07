import { Text, View } from '@react-pdf/renderer'
import { getPdfStyles, colors } from './pdfStyles'
import { splitTextByScript, sanitizeEmojiAndText, PDF_FONT_FAMILY } from './fonts'

export function renderTextSegments(textStr, options = {}, keyPrefix = 'seg') {
  if (textStr === null || textStr === undefined) return null
  const baseFamily = options.safeMode ? 'Helvetica' : PDF_FONT_FAMILY
  const clean = sanitizeEmojiAndText(String(textStr), options)
  if (!clean) return null

  const segments = splitTextByScript(clean, baseFamily, options)
  if (segments.length === 1 && segments[0].fontFamily === baseFamily) {
    return segments[0].text
  }
  return segments.map((seg, i) => (
    <Text key={`${keyPrefix}-${i}`} style={{ fontFamily: seg.fontFamily }}>
      {seg.text}
    </Text>
  ))
}

export function Section({ title, sectionKey, children, style = {}, wrap = true, options = {} }) {
  const styles = getPdfStyles()
  return (
    <View style={[styles.section, style]} wrap={wrap}>
      {sectionKey ? <Text style={styles.sectionKey}>{renderTextSegments(sectionKey, options, 'seckey')}</Text> : null}
      {title ? <Text style={styles.sectionHeader}>{renderTextSegments(title, options, 'sectitle')}</Text> : null}
      {children}
    </View>
  )
}

export function KeyValueRow({ label, value, options = {} }) {
  const styles = getPdfStyles()
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyLabel}>{renderTextSegments(label, options, 'kvlbl')}</Text>
      <Text style={styles.keyValue}>{renderTextSegments(value, options, 'kvval')}</Text>
    </View>
  )
}

export function BulletList({ items = [], options = {} }) {
  const styles = getPdfStyles()
  if (!items?.length) return null
  return (
    <View wrap>
      {items.map((item, idx) => (
        <View key={`bullet-${idx}`} style={styles.bulletItem} wrap>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{renderTextSegments(item, options, `bullet-${idx}`)}</Text>
        </View>
      ))}
    </View>
  )
}

export function Table({ headers = [], rows = [], options = {} }) {
  const styles = getPdfStyles()
  if (!headers?.length && !rows?.length) return null
  return (
    <View style={styles.table} wrap>
      {headers?.length > 0 && (
        <View style={[styles.tableRow, styles.tableHeaderRow]} wrap={false}>
          {headers.map((h, idx) => (
            <Text key={`th-${idx}`} style={styles.tableHeaderCell}>
              {renderTextSegments(h, options, `th-${idx}`)}
            </Text>
          ))}
        </View>
      )}
      {rows.map((row, rIdx) => (
        <View key={`tr-${rIdx}`} style={styles.tableRow} wrap={false}>
          {row.map((cell, cIdx) => (
            <Text key={`td-${rIdx}-${cIdx}`} style={styles.tableCell}>
              {renderTextSegments(cell, options, `td-${rIdx}-${cIdx}`)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

export function ProgressBar({ percent = 0, color = colors.primaryLight }) {
  const styles = getPdfStyles()
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0))
  return (
    <View style={styles.progressBarTrack}>
      <View style={[styles.progressBarFill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  )
}

export function Badge({ children, style = {}, options = {} }) {
  const styles = getPdfStyles()
  return <Text style={[styles.badge, style]}>{renderTextSegments(children, options, 'bdg')}</Text>
}


