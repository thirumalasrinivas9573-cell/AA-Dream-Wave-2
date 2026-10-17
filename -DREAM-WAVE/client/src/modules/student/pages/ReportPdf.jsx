import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { PdfDocument, markdownToPdf, Section, Badge, BulletList, colors, sanitizeEmojiAndText, renderTextSegments } from '@shared/pdf'

function getCustomStyles() {
  return StyleSheet.create({
    headerContainer: {
      marginBottom: 16,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primaryLight,
      borderBottomStyle: 'solid',
      paddingBottom: 10,
    },
    reportTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 6,
    },
    workspaceTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.primaryLight,
    },
    researchQuestion: {
      fontSize: 9.5,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    summaryCard: {
      backgroundColor: colors.primaryBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryLight,
      borderLeftStyle: 'solid',
      padding: 10,
      borderRadius: 4,
      marginBottom: 14,
    },
    summaryHeading: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 4,
    },
    summaryText: {
      fontSize: 9.5,
      lineHeight: 1.5,
      color: colors.textDark,
    },
    reviewNotesCard: {
      backgroundColor: colors.dangerBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.dangerBorder,
      borderLeftStyle: 'solid',
      padding: 10,
      borderRadius: 4,
      marginBottom: 14,
    },
    reviewNotesHeading: {
      fontSize: 11,
      fontWeight: 'bold',
      color: colors.dangerText,
      marginBottom: 4,
    },
  })
}

export function ReportPdf({ workspace = {}, report = {}, options = {} }) {
  const customStyles = getCustomStyles()

  const rawReportTitle = report.title || workspace.title || 'Research Report'
  const rawWorkspaceTitle = workspace.title || 'Research Workspace'
  const rawResearchQuestion = workspace.researchQuestion || ''
  const summary = report.summary || ''
  const qualityIssues = Array.isArray(report.qualityIssues) ? report.qualityIssues : []
  const sections = Array.isArray(report.sections) ? report.sections : []

  const rawDate = report.date || report.createdAt || workspace.date || workspace.createdAt || new Date()
  const parsedDate = new Date(rawDate)
  const formattedDate = !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <PdfDocument title={sanitizeEmojiAndText(rawReportTitle, options)} author="Dream Wave AI">
      {/* Title & Subtitle Banner */}
      <View style={customStyles.headerContainer} wrap={false}>
        <Text style={customStyles.reportTitle}>{renderTextSegments(rawReportTitle, options, 'rpt-title')}</Text>
        <Text style={customStyles.workspaceTitle}>Workspace: {renderTextSegments(rawWorkspaceTitle, options, 'ws-title')}</Text>
        {rawResearchQuestion ? (
          <Text style={customStyles.researchQuestion}>Question: “{renderTextSegments(rawResearchQuestion, options, 'rq')}”</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {report.template ? <Badge options={options}>Template: {report.template}</Badge> : null}
          {formattedDate ? <Badge options={options}>{`Date: ${formattedDate}`}</Badge> : null}
        </View>
      </View>

      {/* Executive Summary (if present) */}
      {summary.trim() ? (
        <View style={customStyles.summaryCard} wrap>
          <Text style={customStyles.summaryHeading}>Executive Summary</Text>
          <Text style={customStyles.summaryText}>{renderTextSegments(summary, options, 'summary')}</Text>
        </View>
      ) : null}

      {/* Review Notes / Quality Issues (omit if empty) */}
      {qualityIssues.length > 0 ? (
        <View style={customStyles.reviewNotesCard} wrap={false}>
          <Text style={customStyles.reviewNotesHeading}>Review Notes</Text>
          <BulletList items={qualityIssues} options={options} />
        </View>
      ) : null}

      {/* Report Sections */}
      {sections.map((sec, idx) => (
        <Section
          key={sec.key || `sec-${idx}`}
          title={sec.title || sec.key || `Section ${idx + 1}`}
          sectionKey={sec.key || undefined}
          options={options}
          wrap
        >
          {markdownToPdf(sec.content, options)}
        </Section>
      ))}
    </PdfDocument>
  )
}


export default ReportPdf

