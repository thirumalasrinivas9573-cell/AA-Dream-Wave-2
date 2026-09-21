import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { profileApi } from '@shared/services/api'
import SeoHead from '@shared/components/SeoHead'
import { ErrorState, LoadingState } from '@shared/components/ui'
import { safeExternalUrl } from '@shared/utils/safeUrl'
import {
  AchievementTimeline,
  CredentialGallery,
  KnowledgeGraph,
  ProjectPortfolio,
} from '../components/profile/ProfileWorkspace'
import AcademicJourneyPanel from '../components/profile/AcademicJourneyPanel'
import ExperiencePanel from '../components/profile/ExperiencePanel'
import '../styles/profile.css'

export default function PublicPortfolio() {
  const { username } = useParams()
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    profileApi.public(username)
      .then((response) => setPortfolio(response.data.portfolio))
      .catch((requestError) => setError(requestError.response?.status === 404 ? 'This portfolio is private or unavailable.' : requestError.userMessage || 'Portfolio unavailable.'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <main className="public-portfolio"><LoadingState label="Loading student portfolio…" rows={8} /></main>
  if (error || !portfolio) return <main className="public-portfolio"><ErrorState title="Portfolio not found" message={error} /><Link to="/" className="btn btn-secondary">Dream Wave home</Link></main>

  const { person, seo, sections = {} } = portfolio
  return (
    <main className="public-portfolio">
      <SeoHead title={seo.title} description={seo.description} image={seo.image} canonical={`/students/${person.username}`} robots={seo.robots} jsonLd={portfolio.jsonLd} />
      <header className="portfolio-nav"><Link to="/">Dream Wave</Link><button type="button" onClick={() => navigator.share ? navigator.share({ title: seo.title, url: window.location.href }) : navigator.clipboard?.writeText(window.location.href)}>Share portfolio</button></header>
      <section className="portfolio-hero">
        <div className="portfolio-cover" style={person.coverBanner ? { backgroundImage: `linear-gradient(rgba(7,9,18,.16),rgba(7,9,18,.88)),url("${person.coverBanner}")` } : undefined} />
        <div className="portfolio-person">
          <div className="portfolio-avatar">{person.profilePhoto ? <img src={person.profilePhoto} alt={`${person.displayName || 'Student'} profile`} /> : person.displayName?.[0] || 'S'}</div>
          <div><span>@{person.username}</span><h1>{person.displayName || 'Student'}</h1><h2>{person.headline}</h2><p>{portfolio.portfolioIntro || person.bio}</p><div className="portfolio-meta">{person.location && <span>⌖ {person.location}</span>}{portfolio.academic?.institution && <span>▣ {portfolio.academic.institution}</span>}{portfolio.academic?.course && <span>◈ {portfolio.academic.course}</span>}</div><nav>{(person.links || []).map((item) => ({ ...item, safeUrl: safeExternalUrl(item.url, { allowMail: true }) })).filter((item) => item.safeUrl).map((item) => <a href={item.safeUrl} target="_blank" rel="noreferrer" key={item.safeUrl}>{item.label}</a>)}</nav></div>
        </div>
      </section>
      {portfolio.careerDirection && sections.career !== false && (
        <section className="portfolio-section"><header><span>Direction</span><h2>Career focus</h2></header><p>{portfolio.careerDirection.targetRole}</p><div className="portfolio-skills">{(portfolio.careerDirection.interests || []).map((item) => <span key={item}>{item}</span>)}</div></section>
      )}
      {portfolio.learning && sections.about !== false && <section className="portfolio-stats">{[
        ['Goals completed', portfolio.learning.goals.completed],
        ['Tasks completed', portfolio.learning.tasks.completed],
        ['Books read', portfolio.learning.books.read],
        ['Learning hours', portfolio.learning.learningHours],
      ].map(([label, value]) => <article key={label}><strong>{value || 0}</strong><span>{label}</span></article>)}</section>}
      {(portfolio.academicJourney || []).length > 0 && sections.academic !== false && <AcademicJourneyPanel entries={portfolio.academicJourney} publicView />}
      {(portfolio.skills || []).length > 0 && sections.skills !== false && <section className="portfolio-section"><header><span>Capabilities</span><h2>Skills</h2></header><div className="portfolio-skills">{portfolio.skills.map((skill) => <article key={skill._id}><strong>{skill.name}</strong><span>{String(skill.type || 'skill').replaceAll('-', ' ')}</span><i><b style={{ width: `${skill.proficiency || 0}%` }} /></i></article>)}</div></section>}
      {sections.projects !== false && <ProjectPortfolio projects={portfolio.projects || []} publicView />}
      {sections.credentials !== false && <CredentialGallery credentials={portfolio.credentials || []} publicView />}
      {sections.achievements !== false && <AchievementTimeline achievements={portfolio.achievements || []} publicView />}
      {(portfolio.experience || []).length > 0 && sections.experience !== false && <ExperiencePanel entries={portfolio.experience} publicView />}
      {portfolio.graph?.nodes?.length > 1 && <KnowledgeGraph graph={portfolio.graph} />}
      <footer className="portfolio-footer"><strong>Built on Dream Wave</strong><span>A learning identity that grows through evidence.</span></footer>
    </main>
  )
}
