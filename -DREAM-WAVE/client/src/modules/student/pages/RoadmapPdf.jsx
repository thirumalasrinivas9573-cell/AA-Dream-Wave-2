import { Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  PdfDocument,
  Section,
  KeyValueRow,
  BulletList,
  Table,
  ProgressBar,
  Badge,
  getPdfStyles,
  colors,
  sanitizeEmojiAndText,
  renderTextSegments,
} from '@shared/pdf'

function formatDate(raw) {
  if (!raw) return null
  const parsed = new Date(raw)
  if (isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getCustomStyles() {
  return StyleSheet.create({
    headerContainer: {
      marginBottom: 14,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.primaryLight,
      borderBottomStyle: 'solid',
      paddingBottom: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    roadmapTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    goalSubtitle: {
      fontSize: 9.5,
      color: colors.textMuted,
      marginBottom: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 4,
    },
    overviewCard: {
      backgroundColor: colors.primaryBg,
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryLight,
      borderLeftStyle: 'solid',
      padding: 8,
      borderRadius: 4,
      marginBottom: 10,
    },
    overviewHeading: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 3,
    },
    overviewText: {
      fontSize: 9,
      lineHeight: 1.4,
      color: colors.textDark,
    },
    stageCard: {
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight,
    },
    stageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    stageTitle: {
      fontSize: 10.5,
      fontWeight: 'bold',
      color: colors.textDark,
      flex: 1,
      marginRight: 8,
    },
    stageMeta: {
      fontSize: 8.5,
      color: colors.textMuted,
    },
    stageDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: colors.textDark,
      marginTop: 3,
      marginBottom: 4,
    },
    stageSkills: {
      fontSize: 8,
      color: colors.primaryLight,
      marginTop: 2,
    },
    stageDate: {
      fontSize: 8,
      color: colors.textLight,
      marginTop: 1,
    },
    weeklyGroup: {
      marginBottom: 8,
      paddingBottom: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.borderLight,
    },
    weeklyGroupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    weeklyGroupTitle: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: colors.primary,
    },
    weeklyGroupMeta: {
      fontSize: 8,
      color: colors.textMuted,
    },
    weeklyOutcomesLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      color: colors.textLight,
      marginTop: 2,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    projectCard: {
      marginBottom: 8,
      padding: 8,
      backgroundColor: '#FAFAFA',
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    projectTitle: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 2,
    },
    projectDesc: {
      fontSize: 8.5,
      lineHeight: 1.4,
      color: colors.textDark,
      marginBottom: 3,
    },
    projectSkills: {
      fontSize: 8,
      color: colors.textMuted,
    },
    projectStatus: {
      fontSize: 8,
      color: colors.textLight,
      marginTop: 2,
    },
    emptyNotice: {
      fontSize: 8.5,
      fontStyle: 'italic',
      color: colors.textMuted,
      marginVertical: 4,
    },
  })
}

export function RoadmapPdf({ roadmap = {}, goal = {}, options = {} }) {
  // Call getPdfStyles() at render time
  getPdfStyles()
  const customStyles = getCustomStyles()

  const rawTitle = roadmap.title || (goal?.title ? `${goal.title} Roadmap` : '') || roadmap.data?.title || 'Learning Roadmap'
  const isPrimary = Boolean(roadmap.isPrimary || goal?.isPrimary || roadmap.data?.isPrimary)
  const goalCategory = goal?.category || ''
  const goalDescription = goal?.description || roadmap.data?.overview || ''
  const formattedDate = formatDate(roadmap.updatedAt || roadmap.createdAt || roadmap.architecture?.generatedAt || new Date())
  const estimatedDate = formatDate(roadmap.architecture?.estimatedCompletion || goal?.deadline)
  const percentProgress = roadmap.progress?.percent ?? goal?.progress ?? 0

  // 1. Learning Stages ordered
  const learningStages = Array.isArray(roadmap.learningStages) ? [...roadmap.learningStages] : []
  learningStages.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))

  // 2. Weekly Plans grouped by week
  const rawWeeklyPlans = Array.isArray(roadmap.weeklyPlans) ? [...roadmap.weeklyPlans] : []
  rawWeeklyPlans.sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0))

  // Build weekly plans grouped by week map
  const weeklyPlansByWeek = new Map()
  for (const plan of rawWeeklyPlans) {
    const w = Number(plan.week) || 1
    if (!weeklyPlansByWeek.has(w)) {
      weeklyPlansByWeek.set(w, [])
    }
    weeklyPlansByWeek.get(w).push(plan)
  }
  const weeklyWeekEntries = [...weeklyPlansByWeek.entries()].sort((a, b) => a[0] - b[0])

  // Table rows for weekly overview
  const weeklyTableHeaders = ['Week', 'Focus', 'Study Hours', 'Status']
  const weeklyTableRows = rawWeeklyPlans.map((plan, idx) => [
    `Week ${plan.week || idx + 1}`,
    plan.focus || 'General study',
    `${plan.studyHours || 0} hrs`,
    plan.completed ? 'Completed' : 'Pending',
  ])

  // 3. Practice Projects
  const practiceProjects = Array.isArray(roadmap.practiceProjects) ? roadmap.practiceProjects : []

  return (
    <PdfDocument title={sanitizeEmojiAndText(rawTitle, options)} author="Dream Wave AI">
      {/* Title & Metadata Banner */}
      <View style={customStyles.headerContainer} wrap={false}>
        <View style={customStyles.titleRow}>
          <Text style={customStyles.roadmapTitle}>
            {renderTextSegments(rawTitle, options, 'rm-title')}
          </Text>
          {isPrimary ? (
            <Badge style={{ backgroundColor: colors.primaryBg, color: colors.primary }} options={options}>
              Primary
            </Badge>
          ) : null}
        </View>

        {goal?.title && goal.title !== rawTitle ? (
          <Text style={customStyles.goalSubtitle}>
            {renderTextSegments(`Goal: ${goal.title}`, options, 'rm-goal')}
          </Text>
        ) : null}

        <View style={customStyles.badgeRow}>
          {formattedDate ? <Badge options={options}>{`Date: ${formattedDate}`}</Badge> : null}
          {goalCategory ? <Badge options={options}>{goalCategory}</Badge> : null}
          {estimatedDate ? <Badge options={options}>{`Target: ${estimatedDate}`}</Badge> : null}
          <Badge options={options}>{`Progress: ${percentProgress}%`}</Badge>
        </View>
      </View>

      {/* Overview & Key Stats */}
      <Section title="Roadmap Overview" options={options} wrap={false}>
        {goalDescription ? (
          <View style={customStyles.overviewCard}>
            <Text style={customStyles.overviewHeading}>
              {renderTextSegments('Overview', options, 'rm-ov-h')}
            </Text>
            <Text style={customStyles.overviewText}>
              {renderTextSegments(goalDescription, options, 'rm-desc')}
            </Text>
          </View>
        ) : null}
        <KeyValueRow label="Overall Completion" value={`${percentProgress}%`} options={options} />
        <KeyValueRow label="Learning Stages" value={String(learningStages.length)} options={options} />
        <KeyValueRow label="Weekly Plans" value={String(rawWeeklyPlans.length)} options={options} />
        <KeyValueRow label="Practice Projects" value={String(practiceProjects.length)} options={options} />
      </Section>

      {/* Learning Stages */}
      <Section title="Learning Stages" options={options} wrap>
        {learningStages.length > 0 ? (
          learningStages.map((stage, idx) => {
            const stageOrder = stage.order || idx + 1
            const stageTitle = stage.title || `Stage ${stageOrder}`
            const stageStatus = stage.status || 'available'
            const stageProgress = Number(stage.progress) || 0
            const stageTargetDate = formatDate(stage.targetDate)
            const stageSkills = Array.isArray(stage.skills) ? stage.skills.filter(Boolean) : []

            return (
              <View key={stage._id || `stage-${idx}`} style={customStyles.stageCard} wrap={false}>
                <View style={customStyles.stageHeader}>
                  <Text style={customStyles.stageTitle}>
                    {renderTextSegments(`${stageOrder}. ${stageTitle}`, options, `stg-ttl-${idx}`)}
                  </Text>
                  <Text style={customStyles.stageMeta}>
                    {renderTextSegments(`${stageStatus} · ${stageProgress}%`, options, `stg-meta-${idx}`)}
                  </Text>
                </View>

                <ProgressBar percent={stageProgress} />

                {stage.description ? (
                  <Text style={customStyles.stageDesc}>
                    {renderTextSegments(stage.description, options, `stg-desc-${idx}`)}
                  </Text>
                ) : null}

                {stageSkills.length > 0 ? (
                  <Text style={customStyles.stageSkills}>
                    {renderTextSegments(`Skills: ${stageSkills.join(', ')}`, options, `stg-skl-${idx}`)}
                  </Text>
                ) : null}

                {stageTargetDate ? (
                  <Text style={customStyles.stageDate}>
                    {renderTextSegments(`Target: ${stageTargetDate}`, options, `stg-dt-${idx}`)}
                  </Text>
                ) : null}
              </View>
            )
          })
        ) : (
          <Text style={customStyles.emptyNotice}>
            {renderTextSegments('No learning stages defined for this roadmap.', options, 'empty-stages')}
          </Text>
        )}
      </Section>

      {/* Weekly Plans */}
      <Section title="Weekly Plans" options={options} wrap>
        {rawWeeklyPlans.length > 0 ? (
          <>
            <Table headers={weeklyTableHeaders} rows={weeklyTableRows} options={options} />
            {weeklyWeekEntries.map(([weekNum, plans]) => {
              const allOutcomes = plans.flatMap((p) => (Array.isArray(p.outcomes) ? p.outcomes.filter(Boolean) : []))
              return (
                <View key={`wk-group-${weekNum}`} style={customStyles.weeklyGroup} wrap={false}>
                  <View style={customStyles.weeklyGroupHeader}>
                    <Text style={customStyles.weeklyGroupTitle}>
                      {renderTextSegments(`Week ${weekNum}: ${plans.map((p) => p.focus).filter(Boolean).join(' / ') || 'Scheduled Plan'}`, options, `wk-ttl-${weekNum}`)}
                    </Text>
                    <Text style={customStyles.weeklyGroupMeta}>
                      {renderTextSegments(`${plans.reduce((sum, p) => sum + (Number(p.studyHours) || 0), 0)} study hours`, options, `wk-hrs-${weekNum}`)}
                    </Text>
                  </View>
                  {allOutcomes.length > 0 ? (
                    <>
                      <Text style={customStyles.weeklyOutcomesLabel}>
                        {renderTextSegments('Target Outcomes:', options, `wk-out-lbl-${weekNum}`)}
                      </Text>
                      <BulletList items={allOutcomes} options={options} />
                    </>
                  ) : null}
                </View>
              )
            })}
          </>
        ) : (
          <Text style={customStyles.emptyNotice}>
            {renderTextSegments('No weekly plans defined for this roadmap.', options, 'empty-weekly')}
          </Text>
        )}
      </Section>

      {/* Practice Projects */}
      <Section title="Practice Projects" options={options} wrap>
        {practiceProjects.length > 0 ? (
          practiceProjects.map((proj, idx) => {
            const projTitle = proj.title || `Project ${idx + 1}`
            const projSkills = Array.isArray(proj.skills) ? proj.skills.filter(Boolean) : []
            const projStatus = proj.status || 'planned'

            return (
              <View key={proj._id || `proj-${idx}`} style={customStyles.projectCard} wrap={false}>
                <Text style={customStyles.projectTitle}>
                  {renderTextSegments(projTitle, options, `prj-ttl-${idx}`)}
                </Text>
                {proj.description ? (
                  <Text style={customStyles.projectDesc}>
                    {renderTextSegments(proj.description, options, `prj-dsc-${idx}`)}
                  </Text>
                ) : null}
                {projSkills.length > 0 ? (
                  <Text style={customStyles.projectSkills}>
                    {renderTextSegments(`Skills: ${projSkills.join(', ')}`, options, `prj-skl-${idx}`)}
                  </Text>
                ) : null}
                <Text style={customStyles.projectStatus}>
                  {renderTextSegments(`Status: ${projStatus}`, options, `prj-st-${idx}`)}
                </Text>
              </View>
            )
          })
        ) : (
          <Text style={customStyles.emptyNotice}>
            {renderTextSegments('No practice projects defined for this roadmap.', options, 'empty-projects')}
          </Text>
        )}
      </Section>
    </PdfDocument>
  )
}

export default RoadmapPdf
