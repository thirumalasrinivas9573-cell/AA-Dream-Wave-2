import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@shared/components/ui'
import { safeExternalUrl } from '@shared/utils/safeUrl'
import { openBlob } from '@shared/utils/safeUrl'
import { profileApi } from '@shared/services/api'

function ExternalLink({ url, children }) {
  const safeUrl = safeExternalUrl(url, { allowRelative: true })
  return safeUrl ? <a href={safeUrl} target="_blank" rel="noreferrer">{children}</a> : null
}

function DocumentLink({ url, children }) {
  if (String(url || '').startsWith('/api/profile/assets/')) {
    return <button type="button" onClick={() => profileApi.asset(url).then((response) => openBlob(response.data)).catch(() => {})}>{children}</button>
  }
  return <ExternalLink url={url}>{children}</ExternalLink>
}

export const PROFILE_TABS = [
  ['overview', 'Overview'],
  ['academic', 'Academic'],
  ['experience', 'Experience'],
  ['learning', 'Learning'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['credentials', 'Certificates'],
  ['achievements', 'Achievements'],
  ['portfolio', 'Portfolio'],
  ['graph', 'Knowledge Graph'],
]

export const SKILL_TYPES = [
  ['technical', 'Technical'],
  ['soft', 'Soft skill'],
  ['programming-language', 'Programming language'],
  ['framework', 'Framework'],
  ['tool', 'Tool'],
  ['spoken-language', 'Language known'],
]

export function ProfileHero({ user, profile, onEdit, onUpload, uploading, onPreview, onShare }) {
  const shareUrl = `${window.location.origin}/students/${profile.username}`
  return (
    <section className="identity-hero">
      <div className="identity-cover" style={profile.coverBanner ? { backgroundImage: `linear-gradient(rgba(8,8,18,.15),rgba(8,8,18,.78)),url("${profile.coverBanner}")` } : undefined}>
        <label className="identity-cover__upload">
          <span>{uploading === 'cover-banner' ? 'Uploading…' : 'Change cover'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload(event.target.files?.[0], 'cover-banner')} disabled={Boolean(uploading)} />
        </label>
      </div>
      <div className="identity-hero__content">
        <div className="identity-avatar">
          {profile.profilePhoto ? <img src={profile.profilePhoto} alt={`${profile.displayName || user.name}'s profile`} /> : <span>{(profile.displayName || user.name || '?')[0].toUpperCase()}</span>}
          <label aria-label="Upload profile photo"><span>＋</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUpload(event.target.files?.[0], 'profile-photo')} disabled={Boolean(uploading)} /></label>
        </div>
        <div className="identity-hero__identity">
          <div><h1>{profile.displayName || user.name}</h1><span>@{profile.username}</span></div>
          <p className="identity-headline">{profile.headline || 'Add a professional headline to your identity.'}</p>
          <div className="identity-meta">
            {profile.academic?.institution && <span>▣ {profile.academic.institution}</span>}
            {profile.academic?.course && <span>◈ {profile.academic.course}</span>}
            {profile.location && <span>⌖ {profile.location}</span>}
            <span>Level {user.level || 1}</span><span>{user.credits || 0} XP</span>
          </div>
        </div>
        <div className="identity-hero__actions">
          <Button onClick={onEdit}>Edit profile</Button>
          {profile.privacy.visibility !== 'private' && <Link to={`/students/${profile.username}`} target="_blank" className="btn btn-secondary">View portfolio</Link>}
          <Button variant="ghost" onClick={onPreview}>View as public</Button>
          <Button variant="ghost" onClick={() => (onShare ? onShare() : navigator.clipboard?.writeText(shareUrl))} disabled={profile.privacy.visibility === 'private'}>Copy link</Button>
        </div>
      </div>
    </section>
  )
}

export const LearningStats = memo(function LearningStats({ summary, loading }) {
  const items = [
    ['Goals', summary?.goals?.total, `${summary?.goals?.completed || 0} completed`],
    ['Roadmaps', summary?.roadmaps?.total, `${summary?.roadmaps?.completed || 0} completed`],
    ['Books read', summary?.books?.read, `${summary?.books?.readingMinutes || 0} reading min`],
    ['Tasks completed', summary?.tasks?.completed, `${summary?.tasks?.total || 0} total`],
    ['Certificates', summary?.certificates, 'Credentials'],
    ['Projects', summary?.projects, 'Portfolio'],
    ['Learning hours', summary?.learningHours, 'Tracked activity'],
  ]
  return <section className="identity-stats" aria-label="Learning profile">{items.map(([label, value, detail]) => <article key={label}><strong>{loading ? '—' : value || 0}</strong><span>{label}</span><small>{detail}</small></article>)}</section>
})

export function AcademicProfile({ academic }) {
  const rows = [
    ['Institution', academic?.institution],
    ['Department', academic?.department],
    ['Current course', academic?.course],
    ['Semester', academic?.semester],
    ['Year', academic?.year],
    ['CGPA', academic?.cgpa || '—'],
  ]
  return (
    <div className="identity-section-grid">
      <section className="identity-panel"><header><div><span>Verified identity context</span><h2>Academic profile</h2></div></header><dl className="academic-details">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not added'}</dd></div>)}</dl></section>
      <section className="identity-panel"><header><h2>Active courses</h2></header>{academic?.activeCourses?.length ? <ul className="identity-list">{academic.activeCourses.map((course) => <li key={course}>{course}</li>)}</ul> : <EmptyState title="No active courses" message="Add your current subjects from profile editing." />}</section>
      <section className="identity-panel"><header><h2>Completed courses</h2></header>{academic?.completedCourses?.length ? <ul className="identity-list">{academic.completedCourses.map((course) => <li key={course}>✓ {course}</li>)}</ul> : <EmptyState title="No completed courses" message="Completed coursework will appear here." />}</section>
    </div>
  )
}

export function SkillsProfile({ skills, onAdd, onEdit, onDelete }) {
  const groups = useMemo(() => Object.fromEntries(SKILL_TYPES.map(([id, label]) => [id, { label, items: skills.filter((skill) => skill.type === id) }])), [skills])
  return (
    <section className="identity-panel">
      <header><div><span>Mastery and evidence</span><h2>Skills</h2></div><Button onClick={onAdd}>+ Add skill</Button></header>
      {!skills.length ? <EmptyState title="Build your skills profile" message="Add technical, soft, programming, framework, tool and spoken-language skills." action={<Button onClick={onAdd}>Add first skill</Button>} /> : (
        <div className="skill-groups">{Object.entries(groups).map(([type, group]) => group.items.length ? <section key={type}><h3>{group.label}</h3><div>{group.items.map((skill) => <article className="skill-chip-card" key={skill._id}><button type="button" onClick={() => onEdit(skill)}><strong>{skill.name}</strong><small>{skill.proficiency}% proficiency · {skill.years || 0} years</small><span><i style={{ width: `${skill.proficiency}%` }} /></span></button><button type="button" className="identity-remove" onClick={() => onDelete(skill)} aria-label={`Delete ${skill.name}`}>×</button></article>)}</div></section> : null)}</div>
      )}
    </section>
  )
}

export function ProjectPortfolio({ projects, onAdd, onEdit, onDelete, publicView = false }) {
  return (
    <section className="identity-panel">
      <header><div><span>Student portfolio</span><h2>Projects</h2></div>{!publicView && <Button onClick={onAdd}>+ Add project</Button>}</header>
      {!projects.length ? <EmptyState title="No portfolio projects yet" message="Showcase your work, technology stack and outcomes." /> : (
        <div className="project-grid">{projects.map((project) => <article className="project-card" key={project._id}>
          {project.screenshots?.[0] && <img src={project.screenshots[0]} alt={`${project.title} screenshot`} loading="lazy" />}
          <div><div className="project-card__title"><h3>{project.title}</h3><span>{project.status}</span></div><p>{project.description || 'No description added.'}</p><div className="project-tech">{project.technologies?.map((item) => <span key={item}>{item}</span>)}</div><div className="project-links"><ExternalLink url={project.githubUrl}>GitHub</ExternalLink><ExternalLink url={project.demoUrl}>Live demo</ExternalLink></div>{!publicView && <footer><Button variant="ghost" onClick={() => onEdit(project)}>Edit</Button><Button variant="ghost" onClick={() => onDelete(project)}>Delete</Button></footer>}</div>
        </article>)}</div>
      )}
    </section>
  )
}

export function AchievementTimeline({ achievements, onAdd, onEdit, onDelete, publicView = false }) {
  return (
    <section className="identity-panel">
      <header><div><span>Milestones and recognition</span><h2>Achievements</h2></div>{!publicView && <Button onClick={onAdd}>+ Add achievement</Button>}</header>
      {!achievements.length ? <EmptyState title="No achievements added" message="Add competitions, hackathons, research, sports, awards and badges." /> : (
        <ol className="achievement-timeline">{achievements.slice().sort((a, b) => new Date(b.awardedAt || b.createdAt) - new Date(a.awardedAt || a.createdAt)).map((item) => <li key={item._id}><span>{item.type === 'hackathon' ? '⌘' : item.type === 'research' ? '⌕' : '★'}</span><div><time>{item.awardedAt ? new Date(item.awardedAt).toLocaleDateString() : 'Achievement'}</time><h3>{item.title}</h3><small>{item.type}{item.issuer ? ` · ${item.issuer}` : ''}</small><p>{item.description}</p><ExternalLink url={item.evidenceUrl}>View evidence</ExternalLink>{!publicView && <footer><Button variant="ghost" onClick={() => onEdit(item)}>Edit</Button><Button variant="ghost" onClick={() => onDelete(item)}>Delete</Button></footer>}</div></li>)}</ol>
      )}
    </section>
  )
}

export function CredentialGallery({ credentials, query = '', category = '', onAdd, onEdit, onDelete, publicView = false }) {
  const filtered = credentials.filter((item) => (!query || `${item.title} ${item.issuer} ${item.credentialId}`.toLowerCase().includes(query.toLowerCase())) && (!category || item.category === category))
  return (
    <section className="identity-panel">
      <header><div><span>Evidence and trust</span><h2>Certificates</h2></div>{!publicView && <Button onClick={onAdd}>+ Import certificate</Button>}</header>
      {!filtered.length ? <EmptyState title="No matching certificates" message="Import credentials from institutions, courses and professional issuers." /> : (
        <div className="credential-grid">{filtered.map((item) => <article className="credential-card" key={item._id}><span className={`credential-status credential-status--${item.verificationStatus}`}>{item.verificationStatus}</span><div aria-hidden>▧</div><h3>{item.title}</h3><p>{item.issuer}</p><small>{item.category}{item.issuedAt ? ` · ${new Date(item.issuedAt).toLocaleDateString()}` : ''}</small><nav><DocumentLink url={item.documentUrl}>Preview / Download</DocumentLink><ExternalLink url={item.verificationUrl}>Verify</ExternalLink></nav>{!publicView && <footer><Button variant="ghost" onClick={() => onEdit(item)}>Edit</Button><Button variant="ghost" onClick={() => onDelete(item)}>Delete</Button></footer>}</article>)}</div>
      )}
    </section>
  )
}

export function KnowledgeGraph({ graph, loading }) {
  if (loading) return <div className="identity-graph-loading">Building your relationship map…</div>
  if (!graph?.nodes?.length) return <EmptyState title="Knowledge graph is empty" message="Skills, projects, goals and learning activity create deterministic relationships here." />
  const counts = graph.nodes.reduce((result, node) => ({ ...result, [node.type]: (result[node.type] || 0) + 1 }), {})
  return (
    <section className="identity-panel identity-graph">
      <header><div><span>{graph.schemaVersion}</span><h2>Personal Knowledge Graph</h2></div><small>{graph.nodes.length} nodes · {graph.edges.length} relationships</small></header>
      <div className="graph-orbit" aria-hidden="true"><div className="graph-core">You</div>{Object.entries(counts).slice(0, 10).map(([type, count], index) => <span style={{ '--graph-index': index, '--graph-total': Math.min(10, Object.keys(counts).length) }} key={type}>{type}<strong>{count}</strong></span>)}</div>
      <div className="graph-accessible"><h3>Accessible graph summary</h3><ul>{Object.entries(counts).map(([type, count]) => <li key={type}><strong>{count}</strong> {type} nodes</li>)}</ul><details><summary>Relationships</summary><ul>{graph.edges.slice(0, 100).map((edge, index) => <li key={`${edge.source}-${edge.target}-${index}`}>{edge.source} — {edge.type.toLowerCase().replaceAll('_', ' ')} → {edge.target}</li>)}</ul></details></div>
    </section>
  )
}

export function CareerDirectionPanel({ careerDirection, onEdit }) {
  if (!careerDirection?.targetRole && !(careerDirection?.interests || []).length) {
    return (
      <section className="identity-panel">
        <header><div><span>Career focus</span><h2>Career direction</h2></div><Button onClick={onEdit}>Add</Button></header>
        <EmptyState title="No career direction yet" message="Share your target role and public career interests." action={<Button onClick={onEdit}>Add career direction</Button>} />
      </section>
    )
  }
  return (
    <section className="identity-panel">
      <header><div><span>Career focus</span><h2>Career direction</h2></div><Button variant="ghost" onClick={onEdit}>Edit</Button></header>
      <p className="identity-headline">{careerDirection.targetRole}</p>
      <div className="community-tags">{(careerDirection.interests || []).map((item) => <span key={item}>{item}</span>)}</div>
    </section>
  )
}

export function PortfolioReadiness({ profile, completeness }) {
  const checks = completeness?.checks || [
    ['Identity', Boolean(profile.displayName && profile.headline && profile.bio)],
    ['Academic profile', Boolean(profile.academic?.institution && profile.academic?.course)],
    ['Skills', profile.skills?.length >= 3],
    ['Projects', profile.projects?.some((item) => item.visibility === 'public')],
    ['Certificates', profile.credentials?.some((item) => item.visibility === 'public')],
    ['Achievements', profile.achievements?.some((item) => item.visibility === 'public')],
    ['Public visibility', profile.privacy.visibility !== 'private'],
  ].map(([label, done]) => ({ label, done }))
  const completion = completeness?.percent ?? Math.round(checks.filter((item) => item.done).length / checks.length * 100)
  return (
    <section className="identity-panel portfolio-readiness"><header><div><span>Shareable identity</span><h2>Portfolio readiness</h2></div><strong>{completion}%</strong></header><div className="portfolio-readiness__bar"><i style={{ width: `${completion}%` }} /></div><ul>{checks.map((item) => <li className={item.done ? 'is-ready' : ''} key={item.label}><span>{item.done ? '✓' : '○'}</span>{item.label}</li>)}</ul>{profile.privacy.visibility !== 'private' ? <Link to={`/students/${profile.username}`} className="btn btn-primary" target="_blank">Open public portfolio</Link> : <p>Set profile visibility to unlisted or public in Settings before sharing.</p>}</section>
  )
}
