import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { companyApi, interactionApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import PublicProfileActions from '@shared/components/portal/PublicProfileActions'
import SeoHead from '../components/SeoHead'

const COMPARE_KEY = 'dw_company_compare'

export default function CompanyPublicProfile() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [tab, setTab] = useState('about')
  const [msg, setMsg] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [contactMsg, setContactMsg] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [selectedInt, setSelectedInt] = useState(null)

  useEffect(() => {
    setData(null)
    companyApi.publicProfile(slug)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
    companyApi.publicInsights(slug)
      .then((r) => setInsights(r.data.insights))
      .catch(() => setInsights(null))
  }, [slug])

  const track = (type, targetId) => {
    companyApi.publicTrack(slug, type, targetId).catch(() => {})
  }

  const applyJob = async (id) => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.applyJob(id, {})
      setMsg('Job application submitted')
      track('interest', id)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not apply')
    }
  }

  const applyInternship = async (id) => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.applyInternship(id, {})
      setMsg('Internship application submitted')
      track('interest', id)
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not apply')
    }
  }

  const saveJob = async (id) => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.bookmark({ targetType: 'job', targetId: id })
      setMsg('Job saved')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save job')
    }
  }

  const sendContact = async (e) => {
    e.preventDefault()
    setContactMsg('')
    try {
      await companyApi.publicContact(slug, contact)
      setContactMsg('Question sent to the company')
      setContact({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setContactMsg(err.response?.data?.message || 'Could not send message')
    }
  }

  const reportReview = async (id) => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.reportReview(id)
      setMsg('Review reported for moderation')
    } catch {
      setMsg('Could not report review')
    }
  }

  const addCompare = () => {
    try {
      const cur = JSON.parse(sessionStorage.getItem(COMPARE_KEY) || '[]')
      if (!cur.find((c) => c._id === data.company._id)) {
        sessionStorage.setItem(COMPARE_KEY, JSON.stringify(
          [...cur, { _id: data.company._id, name: data.company.name, slug: data.company.slug }].slice(-3),
        ))
      }
    } catch { /* ignore */ }
  }

  if (!data) {
    return <div style={{ padding: 40, color: '#64748B', minHeight: '60vh' }}>Loading company profile…</div>
  }

  const c = data.company
  const seo = data.seo || {}
  const images = (data.gallery || []).filter((g) => g.type === 'image')
  const videos = (data.gallery || []).filter((g) => g.type === 'video')
  const careers = c.careers || {}
  const loc = [c.contact?.city, c.contact?.state, c.contact?.country].filter(Boolean).join(', ')

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'careers', label: 'Careers' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'internships', label: 'Internships' },
    { id: 'events', label: 'Events' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Ask / Contact' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <SeoHead
        title={seo.title || `${c.name} | Dream Wave`}
        description={seo.description}
        canonical={seo.canonical || `/companies/${c.slug}`}
        image={seo.ogImage}
        jsonLd={seo.jsonLd}
        type="profile"
      />

      <header style={{
        minHeight: 280,
        background: c.banner
          ? `linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.88)), url(${c.banner}) center/cover`
          : 'linear-gradient(135deg,#1E3A8A,#2563EB)',
        color: '#fff', display: 'flex', alignItems: 'flex-end', padding: '36px 20px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {c.logo && <img src={c.logo} alt={`${c.name} logo`} width={72} height={72} style={{ borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem,4vw,2.3rem)', color: '#fff' }}>{c.name}</h1>
              {c.verified !== false && <span style={badge('#10B981')}>Verified</span>}
              <span style={badge('#60A5FA')}>AI Trust {c.stats?.aiScore ?? 0}</span>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
              {c.industry || 'Company'}
              {c.foundedYear ? ` · Founded ${c.foundedYear}` : ''}
              {c.companySize ? ` · ${c.companySize} employees` : ''}
              {loc ? ` · ${loc}` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: '0.85rem' }}>
              {c.contact?.website && (
                <a href={c.contact.website} target="_blank" rel="noreferrer" style={{ color: '#BFDBFE' }} onClick={() => track('website')}>Website</a>
              )}
              {(c.social?.linkedin || c.contact?.linkedin) && (
                <a href={c.social?.linkedin || c.contact?.linkedin} target="_blank" rel="noreferrer" style={{ color: '#BFDBFE' }}>LinkedIn</a>
              )}
              {Object.entries(c.social || {}).filter(([k, v]) => v && k !== 'linkedin').map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" style={{ color: '#BFDBFE' }}>{k}</a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setTab('jobs')} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
              View jobs
            </button>
            <Link
              to="/companies"
              onClick={addCompare}
              style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.4)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
            >
              Add to compare
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 64px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <Link to="/companies" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Companies</Link>
          <Link to="/discover" style={{ color: '#64748B', fontSize: '0.85rem' }}>Discovery</Link>
        </div>

        <PublicProfileActions targetType="company" targetId={c._id} accent="#2563EB" />
        {msg && <p role="status" style={{ color: '#2563EB' }}>{msg}</p>}

        <div role="tablist" aria-label="Company sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '18px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                background: tab === t.id ? '#1E3A8A' : '#F1F5F9', color: tab === t.id ? '#fff' : '#334155',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'about' && (
          <Section title="About">
            <p style={{ lineHeight: 1.7 }}>{c.about || 'No about text published yet.'}</p>
            <Grid2>
              <Block label="Mission" text={c.mission} />
              <Block label="Vision" text={c.vision} />
              <Block label="History" text={c.history} />
              <Block label="Culture" text={c.culture} />
              <Block label="Founder message" text={c.founderMessage} />
              <Block label="CEO message" text={c.ceoMessage} />
            </Grid2>
          </Section>
        )}

        {tab === 'showcase' && (
          <>
            <ListCards title="Products" items={c.products} map={(p) => ({ title: p.name, sub: p.description, link: p.url })} />
            <ListCards title="Services" items={c.services} map={(p) => ({ title: p.name, sub: p.description })} />
            <ListCards title="Projects" items={c.projectsShowcase?.length ? c.projectsShowcase : data.projects} map={(p) => ({ title: p.name || p.title, sub: p.description })} />
            <ListCards title="Case studies" items={c.caseStudies} map={(p) => ({ title: p.title, sub: `${p.summary || ''} ${p.outcome || ''}`.trim(), link: p.url })} />
            {(c.techStack || []).length > 0 && (
              <Section title="Technology stack">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {c.techStack.map((t) => <span key={t} style={tag}>{t}</span>)}
                </div>
              </Section>
            )}
            <ListCards title="Awards" items={c.awards} map={(a) => ({ title: a.title, sub: a.year })} />
            <ListCards title="Certifications" items={c.certifications} map={(a) => ({ title: a.title, sub: [a.issuer, a.year].filter(Boolean).join(' · ') })} />
            <ListCards title="Achievements" items={c.achievements} map={(a) => ({ title: a.title, sub: a.description })} />
            {c.officeTour && <Section title="Office tour"><p style={{ lineHeight: 1.7 }}>{c.officeTour}</p></Section>}
          </>
        )}

        {tab === 'careers' && (
          <Section title="Careers">
            <Grid2>
              <Block label="Overview" text={careers.overview} />
              <Block label="Why join us" text={careers.whyJoin} />
              <Block label="Benefits" text={careers.benefits} />
              <Block label="Learning programs" text={careers.learningPrograms} />
              <Block label="Training" text={careers.training} />
              <Block label="Employee growth" text={careers.employeeGrowth} />
              <Block label="Promotion policy" text={careers.promotionPolicy} />
            </Grid2>
            {(data.training || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ color: '#1E3A8A' }}>Active training programs</h3>
                {data.training.map((t) => (
                  <div key={t._id} style={card}>{t.title || t.name} — {t.status}</div>
                ))}
              </div>
            )}
          </Section>
        )}

        {tab === 'jobs' && (
          <Section title={`Open jobs (${(data.jobs || []).length})`}>
            {(data.jobs || []).length === 0 ? <p style={{ color: '#64748B' }}>No open jobs right now.</p> : data.jobs.map((j) => (
              <div key={j._id} style={card}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem' }}>{j.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>
                      {[j.department || j.category, j.location, j.workMode, j.type].filter(Boolean).join(' · ')}
                    </div>
                    {(j.salaryMin || j.salaryMax) ? (
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>₹{j.salaryMin || 0} – ₹{j.salaryMax || 0}</div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" style={btnSec} onClick={() => { setSelectedJob(j); track('job', j._id) }}>Details</button>
                    <button type="button" style={btnSec} onClick={() => saveJob(j._id)}>Save</button>
                    <button type="button" style={btnPri} onClick={() => applyJob(j._id)}>Apply</button>
                  </div>
                </div>
                {selectedJob?._id === j._id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
                    <p>{j.description}</p>
                    {j.education && <p><strong>Education:</strong> {j.education}</p>}
                    {j.experience && <p><strong>Experience:</strong> {j.experience}</p>}
                    {j.responsibilities && <p><strong>Responsibilities:</strong> {j.responsibilities}</p>}
                    {j.benefits && <p><strong>Benefits:</strong> {j.benefits}</p>}
                    {j.hiringProcess && <p><strong>Hiring process:</strong> {j.hiringProcess}</p>}
                    {(j.skills || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{j.skills.map((s) => <span key={s} style={tag}>{s}</span>)}</div>
                    )}
                    {j.deadline && <p><strong>Deadline:</strong> {new Date(j.deadline).toLocaleDateString()}</p>}
                    <Link to={`/companies/jobs/${j._id}`} style={{ color: '#2563EB' }}>Open full job page</Link>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {tab === 'internships' && (
          <Section title={`Internships (${(data.internships || []).length})`}>
            {(data.internships || []).length === 0 ? <p style={{ color: '#64748B' }}>No open internships right now.</p> : data.internships.map((i) => (
              <div key={i._id} style={card}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <strong>{i.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      {[i.duration, i.location, i.workMode, i.stipend ? `₹${i.stipend}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" style={btnSec} onClick={() => { setSelectedInt(i); track('internship', i._id) }}>Details</button>
                    <button type="button" style={btnPri} onClick={() => applyInternship(i._id)}>Apply</button>
                  </div>
                </div>
                {selectedInt?._id === i._id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
                    <p>{i.description}</p>
                    {i.eligibility && <p><strong>Eligibility:</strong> {i.eligibility}</p>}
                    {i.projects && <p><strong>Projects:</strong> {i.projects}</p>}
                    <p><strong>Certificate:</strong> {i.certificate ? 'Yes' : 'No'} · <strong>Conversion:</strong> {i.conversionOpportunity ? 'Possible' : 'Not listed'}</p>
                    {(i.skills || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{i.skills.map((s) => <span key={s} style={tag}>{s}</span>)}</div>
                    )}
                    <Link to={`/companies/internships/${i._id}`} style={{ color: '#2563EB' }}>Open full internship page</Link>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {tab === 'events' && (
          <Section title="Events & hiring drives">
            {(data.events || []).length === 0 && (data.promotions || []).length === 0 ? (
              <p style={{ color: '#64748B' }}>No published events yet.</p>
            ) : (
              <>
                {(data.events || []).map((e) => (
                  <div key={e._id} style={card}>
                    <strong>{e.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{e.type} · {e.startDate ? new Date(e.startDate).toLocaleString() : ''}</div>
                    <p style={{ marginBottom: 0 }}>{e.description}</p>
                  </div>
                ))}
                {(data.promotions || []).map((p) => (
                  <div key={p._id} style={card}>
                    <strong>{p.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{p.category}</div>
                    <p style={{ marginBottom: 0 }}>{p.content}</p>
                  </div>
                ))}
              </>
            )}
          </Section>
        )}

        {tab === 'gallery' && (
          <>
            <Section title="Office photos & gallery">
              {images.length === 0 ? <p style={{ color: '#64748B' }}>No photos published.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                  {images.map((g) => (
                    <button key={g._id} type="button" onClick={() => track('gallery')} style={{ border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}>
                      <img src={g.url} alt={g.title || 'Gallery'} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10 }} />
                    </button>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Videos">
              {videos.length === 0 ? <p style={{ color: '#64748B' }}>No videos published.</p> : videos.map((v) => (
                <div key={v._id} style={card}>
                  <a href={v.url} target="_blank" rel="noreferrer" style={{ color: '#2563EB' }} onClick={() => track('gallery')}>{v.title || v.url}</a>
                </div>
              ))}
            </Section>
          </>
        )}

        {tab === 'insights' && (
          <Section title="AI company insights">
            {!insights ? <p style={{ color: '#64748B' }}>Insights unavailable.</p> : (
              <Grid2>
                <Block label="Company growth" text={insights.companyGrowth} />
                <Block label="Hiring trends" text={insights.hiringTrends} />
                <Block label="Future hiring" text={insights.futureHiring} />
                <Block label="Technology trends" text={insights.technologyTrends} />
                <Block label="Salary trends" text={insights.salaryTrends} />
                <Block label="Career growth" text={insights.careerGrowth} />
                <Block label="Industry ranking" text={insights.industryRanking} />
                <Block label="AI company rating" text={String(insights.aiCompanyRating ?? c.stats?.aiScore ?? 0)} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#1E3A8A' }}>Popular skills</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(insights.popularSkills || []).map((s) => <span key={s} style={tag}>{s}</span>)}
                  </div>
                </div>
                <Block label="Summary" text={insights.summary} />
              </Grid2>
            )}
          </Section>
        )}

        {tab === 'reviews' && (
          <Section title="Reviews">
            <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Students, employees, and interns can leave ratings via Follow / Review actions above. Report fake reviews below.</p>
            {(data.reviews || []).length === 0 ? <p style={{ color: '#64748B' }}>No approved reviews yet.</p> : data.reviews.map((r) => (
              <div key={r._id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{r.title || `${r.rating}/5`} · {r.studentId?.name || 'Reviewer'}</strong>
                  <button type="button" style={btnSec} onClick={() => reportReview(r._id)}>Report</button>
                </div>
                {r.reviewerRole && <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{r.reviewerRole}</div>}
                <p>{r.content}</p>
                {r.interviewExperience && <p><strong>Interview:</strong> {r.interviewExperience}</p>}
                {r.internshipExperience && <p><strong>Internship:</strong> {r.internshipExperience}</p>}
                {r.cultureRating && <p><strong>Culture:</strong> {r.cultureRating}/5</p>}
              </div>
            ))}
          </Section>
        )}

        {tab === 'contact' && (
          <Section title="Ask the company">
            <form onSubmit={sendContact} style={{ maxWidth: 520, display: 'grid', gap: 10 }}>
              {['name', 'email', 'phone', 'subject'].map((k) => (
                <input key={k} required={k === 'name' || k === 'email'} className="company-input" placeholder={k} value={contact[k]} onChange={(e) => setContact({ ...contact, [k]: e.target.value })} style={input} />
              ))}
              <textarea required rows={4} placeholder="Your question" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} style={input} />
              <button type="submit" style={btnPri}>Send question</button>
              {contactMsg && <p role="status" style={{ color: '#059669' }}>{contactMsg}</p>}
            </form>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 24, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <h2 style={{ margin: '0 0 12px', color: '#1E3A8A', fontSize: '1.15rem' }}>{title}</h2>
      {children}
    </section>
  )
}

function Block({ label, text }) {
  if (!text) return null
  return (
    <div>
      <h4 style={{ margin: '0 0 6px', color: '#1E3A8A', fontSize: '0.9rem' }}>{label}</h4>
      <p style={{ margin: 0, lineHeight: 1.65, color: '#334155', whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  )
}

function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>{children}</div>
}

function ListCards({ title, items, map }) {
  if (!items?.length) return null
  return (
    <Section title={title}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        {items.map((raw, i) => {
          const p = map(raw)
          return (
            <div key={i} style={{ ...card, marginBottom: 0 }}>
              <strong>{p.title}</strong>
              {p.sub && <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748B' }}>{p.sub}</p>}
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontSize: '0.85rem' }}>Open</a>}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function badge(bg) {
  return { background: bg, color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800 }
}

const card = { padding: 14, marginBottom: 10, borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC' }
const tag = { padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1E3A8A', fontSize: '0.75rem', fontWeight: 600 }
const btnPri = { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const btnSec = { padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }
const input = { padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', font: 'inherit', width: '100%' }
