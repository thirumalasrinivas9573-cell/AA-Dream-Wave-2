import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { Table } from './pdfComponents'
import { PDF_FONT_FAMILY, splitTextByScript, sanitizeEmojiAndText } from './fonts'

function getMarkdownStyles() {
  const baseFont = PDF_FONT_FAMILY
  return StyleSheet.create({
    paragraph: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: '#1F2937',
      marginBottom: 6,
      fontFamily: baseFont,
    },
    h1: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#4C1D95',
      marginTop: 10,
      marginBottom: 4,
      fontFamily: baseFont,
    },
    h2: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#6D28D9',
      marginTop: 8,
      marginBottom: 4,
      fontFamily: baseFont,
    },
    h3: {
      fontSize: 10.5,
      fontWeight: 'bold',
      color: '#374151',
      marginTop: 6,
      marginBottom: 3,
      fontFamily: baseFont,
    },
    h4: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: '#4B5563',
      marginTop: 5,
      marginBottom: 2,
      fontFamily: baseFont,
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 4,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 10,
      fontSize: 9.5,
      color: '#6D28D9',
    },
    bulletText: {
      flex: 1,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: '#1F2937',
      fontFamily: baseFont,
    },
    blockquote: {
      backgroundColor: '#F5F3FF',
      borderLeftWidth: 3,
      borderLeftColor: '#8B5CF6',
      borderLeftStyle: 'solid',
      padding: 6,
      marginVertical: 4,
      borderRadius: 2,
    },
    blockquoteText: {
      fontSize: 9,
      fontStyle: 'italic',
      color: '#4C1D95',
      fontFamily: baseFont,
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      borderBottomStyle: 'solid',
      marginVertical: 8,
    },
    codeBlock: {
      backgroundColor: '#F3F4F6',
      borderRadius: 4,
      padding: 6,
      marginVertical: 4,
      fontFamily: 'Courier',
      fontSize: 8.5,
      color: '#1F2937',
    },
    bold: {
      fontWeight: 'bold',
    },
    italic: {
      fontStyle: 'italic',
    },
    linkText: {
      color: '#2563EB',
    },
    linkUrl: {
      fontSize: 8.5,
      color: '#6B7280',
      fontStyle: 'italic',
    },
  })
}

function renderScriptSegments(textStr, options = {}, keyPrefix = 'seg') {
  const baseFamily = options.safeMode ? 'Helvetica' : PDF_FONT_FAMILY
  const segments = splitTextByScript(textStr, baseFamily)
  if (segments.length === 1 && segments[0].fontFamily === baseFamily) {
    return segments[0].text
  }
  return segments.map((seg, i) => (
    <Text key={`${keyPrefix}-${i}`} style={{ fontFamily: seg.fontFamily }}>
      {seg.text}
    </Text>
  ))
}

/**
 * Parses inline markdown:
 * - Links: [text](url) -> "text (url)"
 * - Bold: **text**
 * - Italic: *text*
 */
function parseInline(textStr, styles, options = {}, keyPrefix = 'inline') {
  const clean = sanitizeEmojiAndText(textStr, options)
  if (!clean) return null

  const parts = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let lastIdx = 0
  let match

  while ((match = linkRegex.exec(clean)) !== null) {
    if (match.index > lastIdx) {
      parts.push(parseFormatting(clean.substring(lastIdx, match.index), styles, options, `${keyPrefix}-pre-${match.index}`))
    }
    const label = match[1]
    const url = match[2]
    parts.push(
      <Text key={`${keyPrefix}-link-${match.index}`}>
        <Text style={styles.linkText}>{renderScriptSegments(label, options, `${keyPrefix}-lnk-lbl-${match.index}`)}</Text>
        <Text style={styles.linkUrl}> ({url})</Text>
      </Text>
    )
    lastIdx = linkRegex.lastIndex
  }

  if (lastIdx < clean.length) {
    parts.push(parseFormatting(clean.substring(lastIdx), styles, options, `${keyPrefix}-post`))
  }

  return parts.length > 0 ? parts : parseFormatting(clean, styles, options, keyPrefix)
}

/**
 * Parses bold **text** and italic *text*
 */
function parseFormatting(cleanStr, styles, options, keyPrefix) {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(cleanStr)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderScriptSegments(cleanStr.substring(lastIndex, match.index), options, `${keyPrefix}-txt-${lastIndex}`))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <Text key={`${keyPrefix}-b-${match.index}`} style={styles.bold}>
          {renderScriptSegments(token.slice(2, -2), options, `${keyPrefix}-b-seg-${match.index}`)}
        </Text>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <Text key={`${keyPrefix}-i-${match.index}`} style={styles.italic}>
          {renderScriptSegments(token.slice(1, -1), options, `${keyPrefix}-i-seg-${match.index}`)}
        </Text>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < cleanStr.length) {
    parts.push(renderScriptSegments(cleanStr.substring(lastIndex), options, `${keyPrefix}-end`))
  }

  return parts.length > 0 ? parts : renderScriptSegments(cleanStr, options, `${keyPrefix}-raw`)
}

/**
 * Converts markdown string into structured @react-pdf components.
 */
export function markdownToPdf(markdownText, options = {}) {
  if (!markdownText) return null
  const styles = getMarkdownStyles(options)



  const text = String(markdownText).replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const elements = []

  let inCodeBlock = false
  let codeBuffer = []
  let inTable = false
  let tableHeader = []
  let tableRows = []

  const flushTable = (key) => {
    if (inTable && (tableHeader.length || tableRows.length)) {
      elements.push(
        <Table key={`tbl-${key}`} headers={tableHeader} rows={tableRows} />
      )
      tableHeader = []
      tableRows = []
      inTable = false
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Fenced Code Block Toggle
    if (trimmed.startsWith('```')) {
      flushTable(index)
      if (inCodeBlock) {
        elements.push(
          <View key={`code-${index}`} style={styles.codeBlock} wrap={false}>
            <Text>{renderScriptSegments(codeBuffer.join('\n'), { ...options, isCode: true }, `code-${index}`)}</Text>
          </View>
        )
        codeBuffer = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      return
    }

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => sanitizeEmojiAndText(c.trim()))

      // Table divider line (| --- | --- |)
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        return
      }

      if (!inTable) {
        inTable = true
        tableHeader = cells
      } else {
        tableRows.push(cells)
      }
      return
    }

    // If line is not a table row, flush existing table
    flushTable(index)

    if (!trimmed) return

    // Horizontal Rule
    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      elements.push(<View key={`hr-${index}`} style={styles.hr} wrap={false} />)
      return
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <View key={`bq-${index}`} style={styles.blockquote} wrap>
          <Text style={styles.blockquoteText}>
            {parseInline(trimmed.slice(2), styles, options, `bq-${index}`)}
          </Text>
        </View>
      )
      return
    }

    // Headings # to ####
    if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${index}`} style={styles.h1} wrap={false}>
          {parseInline(trimmed.slice(2), styles, options, `h1-${index}`)}
        </Text>
      )
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${index}`} style={styles.h2} wrap={false}>
          {parseInline(trimmed.slice(3), styles, options, `h2-${index}`)}
        </Text>
      )
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${index}`} style={styles.h3} wrap={false}>
          {parseInline(trimmed.slice(4), styles, options, `h3-${index}`)}
        </Text>
      )
    } else if (trimmed.startsWith('#### ')) {
      elements.push(
        <Text key={`h4-${index}`} style={styles.h4} wrap={false}>
          {parseInline(trimmed.slice(5), styles, options, `h4-${index}`)}
        </Text>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      elements.push(
        <View key={`bullet-${index}`} style={styles.bulletItem} wrap>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{parseInline(trimmed.slice(2), styles, options, `bullet-${index}`)}</Text>
        </View>
      )
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)/)
      const num = match ? match[1] : '•'
      const contentStr = match ? match[2] : trimmed
      elements.push(
        <View key={`num-${index}`} style={styles.bulletItem} wrap>
          <Text style={styles.bulletDot}>{num}</Text>
          <Text style={styles.bulletText}>{parseInline(contentStr, styles, options, `num-${index}`)}</Text>
        </View>
      )
    } else {
      elements.push(
        <Text key={`p-${index}`} style={styles.paragraph} wrap>
          {parseInline(line, styles, options, `p-${index}`)}
        </Text>
      )
    }
  })



  flushTable('end')

  return elements
}
