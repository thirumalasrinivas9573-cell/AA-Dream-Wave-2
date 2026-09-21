import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { institutionApi, interactionApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import PublicProfileActions from '@shared/components/portal/PublicProfileActions'
import SeoHead from '../components/SeoHead'
import { TYPE_LABEL } from '../components/InstitutionCard'

export default function InstitutionPublicProfile() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [tab, setTab] = useState('about')
  const [applyMsg, setApplyMsg] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [contactMsg, setContactMsg] = useState('')

  useEffect(() => {
    setData(null)
    institutionApi.publicProfile(slug)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
    institutionApi.publicInsights(slug)
      .then((r) => setInsights(r.data.insights))
      .catch(() => setInsights(null))
  }, [slug])

  const track = (type) => {
    institutionApi.publicTrack(slug, type).catch(() => {})
  }

  const applyNow = async () => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.applyAdmission(data.institution._id, { coverLetter: 'Application via public institution profile' })
      setApplyMsg('Application submitted')
    } catch (err) {
      setApplyMsg(err.response?.data?.message || 'Could not apply')
    }
  }

  const sendContact = async (e) => {
    e.preventDefault()
    setContactMsg('')
    try {
      await institutionApi.publicContact(slug, contact)
      setContactMsg('Message sent to the institution')
      setContact({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      setContactMsg(err.response?.data?.message || 'Could not send message')
    }
  }

  const reportReview = async (id) => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.reportReview(id)
      setApplyMsg('Review reported for moderation')
    } catch {
      setApplyMsg('Could not report review')
    }
  }

  if (!data) {
    return <div style={{ padding: 40, color: '#64748B', minHeight: '60vh' }}>Loading institution profile…</div>
  }

  const i = data.institution
  const seo = data.seo || {}
  const images = (data.gallery || []).filter((g) => g.type === 'image')
  const videos = (data.gallery || []).filter((g) => g.type === 'video')
  const announcements = (data.promotions || []).filter((p) =>
    ['announcement', 'admission', 'scholarship', 'result', 'news'].includes(p.category),
  )

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'campus', label: 'Campus' },
    { id: 'academics', label: 'Academics' },
    { id: 'placements', label: 'Placements' },
    { id: 'scholarships', label: 'Scholarships' },
    { id: 'events', label: 'Events' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <SeoHead
        title={seo.title || `${i.name} | Dream Wave`}
        description={seo.description}
        canonical={seo.canonical || `/institutions/${i.slug}`}
        image={seo.ogImage}
        jsonLd={seo.jsonLd}
        type="profile"
      />

      <header style={{
        minHeight: 260,
        background: i.banner
          ? `linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.85)), url(${i.banner}) center/cover`
          : 'linear-gradient(135deg,#1E3A5F,#2563EB)',
        color: '#fff', display: 'flex', alignItems: 'flex-end', padding: '36px 20px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {i.logo && <img src={i.logo} alt={`${i.name} logo`} width={72} height={72} style={{ borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem,4vw,2.3rem)', color: '#fff' }}>{i.name}</h1>
              {i.verified !== false && <span style={badge('#10B981')}>Verified</span>}
              <span style={badge('#38BDF8')}>AI {i.stats?.aiRating ?? 0}</span>
            </div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.92rem' }}>
              {TYPE_LABEL[i.institutionType] || 'Institution'}
              {i.establishedYear ? ` · Est. ${i.establishedYear}` : ''}
              {[i.contact?.city, i.contact?.state, i.contact?.country].filter(Boolean).length
                ? ` · ${[i.contact?.city, i.contact?.state, i.contact?.country].filter(Boolean).join(', ')}`
                : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: '0.85rem' }}>
              {i.contact?.website && <a href={i.contact.website} target="_blank" rel="noreferrer" style={{ color: '#BFDBFE' }}>Website</a>}
              {Object.entries(i.social || {}).filter(([, v]) => v).map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" style={{ color: '#BFDBFE' }}>{k}</a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={applyNow} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#10B981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Apply Now</button>
            <Link
              to="/institutions"
              onClick={() => {
                try {
                  const cur = JSON.parse(sessionStorage.getItem('dw_compare') || '[]')
                  if (!cur.find((c) => c._id === i._id)) {
                    sessionStorage.setItem('dw_compare', JSON.stringify([...cur, { _id: i._id, name: i.name, slug: i.slug }].slice(-3)))
                  }
                } catch { /* ignore */ }
              }}
              style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.4)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
            >
              Add to compare
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 64px' }}>
        <Link to="/institutions" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Browse institutions</Link>
        <PublicProfileActions targetType="institution" targetId={i._id} accent="#2563EB" />
        {applyMsg && <p style={{ color: '#059669' }}>{applyMsg}</p>}

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '8px 0 20px', paddingBottom: 4 }} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id)
                if (t.id === 'campus') track('gallery')
                if (t.id === 'academics') track('course')
                if (t.id === 'placements') track('placement')
              }}
              style={{
                padding: '8px 14px', borderRadius: 999, border: '1px solid #CBD5E1', whiteSpace: 'nowrap', cursor: 'pointer',
                background: tab === t.id ? '#1E3A5F' : '#fff', color: tab === t.id ? '#fff' : '#334155', fontWeight: 600, fontSize: '0.82rem',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'about' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Section title="About"><p style={{ lineHeight: 1.7 }}>{i.about || 'No about text published yet.'}</p></Section>
            <Section title="Mission & Vision">
              <p><strong>Mission:</strong> {i.mission || '—'}</p>
              <p><strong>Vision:</strong> {i.vision || '—'}</p>
            </Section>
            {i.history && <Section title="History"><p style={{ lineHeight: 1.7 }}>{i.history}</p></Section>}
            {(i.leadership?.chairmanMessage || i.leadership?.principalMessage || i.leadership?.directorMessage) && (
              <Section title="Leadership messages">
                {i.leadership.chairmanMessage && <p><strong>Chairman:</strong> {i.leadership.chairmanMessage}</p>}
                {i.leadership.principalMessage && <p><strong>Principal:</strong> {i.leadership.principalMessage}</p>}
                {i.leadership.directorMessage && <p><strong>Director:</strong> {i.leadership.directorMessage}</p>}
              </Section>
            )}
            {(i.achievements || []).length > 0 && (
              <Section title="Achievements">
                {i.achievements.map((a, idx) => <div key={idx}><strong>{a.title}</strong> ({a.year}) — {a.description}</div>)}
              </Section>
            )}
          </div>
        )}

        {tab === 'campus' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Section title="Campus facilities">
              <Grid>
                {['laboratories', 'library', 'hostels', 'sports', 'transportation', 'cafeteria', 'medical'].map((k) => (
                  i.campus?.[k] ? <Card key={k} title={k} sub={i.campus[k]} /> : null
                ))}
              </Grid>
              {(i.facilities || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {i.facilities.map((f, idx) => <span key={idx} style={chip}>{f}</span>)}
                </div>
              )}
            </Section>
            {images.length > 0 && (
              <Section title="Campus photos">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                  {images.map((g) => (
                    <img key={g._id} src={g.url} alt={g.caption || 'Campus'} style={{ width: '100%', borderRadius: 10, aspectRatio: '4/3', objectFit: 'cover' }} />
                  ))}
                </div>
              </Section>
            )}
            {videos.length > 0 && (
              <Section title="Campus videos">
                {videos.map((v) => (
                  <div key={v._id} style={{ marginBottom: 12 }}>
                    <video src={v.url} controls style={{ width: '100%', borderRadius: 10, maxHeight: 360, background: '#000' }} />
                    {v.caption && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>{v.caption}</p>}
                  </div>
                ))}
              </Section>
            )}
            {!images.length && !videos.length && !(i.campus && Object.values(i.campus).some(Boolean)) && (
              <Section title="Campus"><p style={{ color: '#64748B' }}>Campus media and facility details will appear when published by the institution.</p></Section>
            )}
          </div>
        )}

        {tab === 'academics' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {(data.departments || []).length > 0 && (
              <Section title="Departments">
                <Grid>{data.departments.map((d) => <Card key={d._id} title={d.name} sub={d.head ? `HoD: ${d.head}` : d.code} />)}</Grid>
              </Section>
            )}
            <Section title="Courses & programs">
              <Grid>
                {(data.courses || []).map((c) => (
                  <Card
                    key={c._id}
                    title={c.title}
                    sub={`${c.level || ''} · ${c.duration || '—'} · Fees ₹${Number(c.fees || 0).toLocaleString()}`}
                    body={[c.eligibility && `Eligibility: ${c.eligibility}`, c.curriculum && `Curriculum: ${c.curriculum.slice(0, 120)}…`].filter(Boolean).join('\n')}
                  />
                ))}
              </Grid>
              {!data.courses?.length && <p style={{ color: '#64748B' }}>No courses published yet.</p>}
            </Section>
            {i.academicCalendar && <Section title="Academic calendar"><p style={{ whiteSpace: 'pre-wrap' }}>{i.academicCalendar}</p></Section>}
            {(data.research || []).length > 0 && (
              <Section title="Research">
                {data.research.map((r) => (
                  <div key={r._id} style={{ marginBottom: 8 }}><strong>{r.title}</strong> — {r.summary} {r.url && <a href={r.url}>Link</a>}</div>
                ))}
              </Section>
            )}
            {(data.faculty || []).length > 0 && (
              <Section title="Faculty directory">
                <Grid>{data.faculty.map((f) => <Card key={f._id} title={f.name} sub={f.designation || f.qualification} />)}</Grid>
              </Section>
            )}
          </div>
        )}

        {tab === 'placements' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <Section title="Placement statistics">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
                <Stat label="Placement %" value={`${i.stats?.placementRate ?? 0}%`} />
                <Stat label="Highest package" value={`₹${Number(i.stats?.highestPackage || 0).toLocaleString()}`} />
                <Stat label="Average package" value={`₹${Number(i.stats?.averagePackage || 0).toLocaleString()}`} />
              </div>
              {i.placementTimeline && <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{i.placementTimeline}</p>}
              {i.internshipsInfo && <p style={{ marginTop: 8 }}><strong>Internships:</strong> {i.internshipsInfo}</p>}
            </Section>
            <Section title="Recruiters & visits">
              {(i.recruiters || []).length > 0 && (
                <Grid>{i.recruiters.map((r, idx) => <Card key={idx} title={r.name} sub={r.package ? `Package: ${r.package}` : ''} />)}</Grid>
              )}
              {(data.placements || []).map((p) => (
                <div key={p._id} style={{ padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                  {p.company} — {p.role} — ₹{p.package} ({p.studentsPlaced} placed){p.year ? ` · ${p.year}` : ''}
                  {p.galleryUrl && <> · <a href={p.galleryUrl} target="_blank" rel="noreferrer">Gallery</a></>}
                </div>
              ))}
              {!data.placements?.length && !(i.recruiters || []).length && <p style={{ color: '#64748B' }}>No placement records yet.</p>}
            </Section>
          </div>
        )}

        {tab === 'scholarships' && (
          <Section title="Scholarships">
            {(data.scholarships || []).length === 0 && !i.scholarships ? (
              <p style={{ color: '#64748B' }}>No scholarships listed yet.</p>
            ) : (
              <>
                {(data.scholarships || []).map((s) => (
                  <div key={s._id} style={{ padding: '12px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <strong>{s.title}</strong> — {s.amount}
                    <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4 }}>{s.eligibility}</div>
                    {s.deadline && <div style={{ fontSize: '0.8rem' }}>Deadline: {new Date(s.deadline).toLocaleDateString()}</div>}
                    {s.description && <p style={{ fontSize: '0.88rem' }}>{s.description}</p>}
                    {s.link && <a href={s.link} target="_blank" rel="noreferrer">Apply / details</a>}
                  </div>
                ))}
                {i.scholarships && <p style={{ marginTop: 12 }}>{i.scholarships}</p>}
              </>
            )}
          </Section>
        )}

        {tab === 'events' && (
          <Section title="Events">
            {(data.events || []).length === 0 ? <p style={{ color: '#64748B' }}>No upcoming events published.</p> : (
              data.events.map((ev) => (
                <div key={ev._id} style={{ padding: '10px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <strong>{ev.title}</strong> · {ev.type} · {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'TBD'}
                  {ev.venue && <span> · {ev.venue}</span>}
                  {ev.description && <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.88rem' }}>{ev.description}</p>}
                </div>
              ))
            )}
          </Section>
        )}

        {tab === 'announcements' && (
          <Section title="Announcements">
            {announcements.length === 0 ? <p style={{ color: '#64748B' }}>No announcements yet.</p> : (
              announcements.map((p) => (
                <div key={p._id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>{p.category}</div>
                  <strong>{p.title}</strong>
                  <p style={{ margin: '4px 0 0', color: '#475569' }}>{p.content}</p>
                </div>
              ))
            )}
          </Section>
        )}

        {tab === 'insights' && (
          <Section title="AI insights">
            {!insights ? <p style={{ color: '#64748B' }}>Generating insights from live campus data…</p> : (
              <div style={{ display: 'grid', gap: 12 }}>
                <p>{insights.summary}</p>
                <Insight label="Best courses" value={(insights.bestCourses || []).join(', ')} />
                <Insight label="Trending programs" value={(insights.trendingPrograms || []).join(', ')} />
                <Insight label="Industry demand" value={insights.industryDemand} />
                <Insight label="Placement forecast" value={insights.placementForecast} />
                <Insight label="Salary outlook" value={insights.salaryOutlook} />
                <Insight label="Future skills" value={(insights.futureSkills || []).join(', ')} />
                <Insight label="Admission competition" value={insights.admissionCompetition} />
                <Insight label="Career opportunities" value={(insights.careerOpportunities || []).join(', ')} />
              </div>
            )}
          </Section>
        )}

        {tab === 'reviews' && (
          <Section title="Student reviews">
            {(data.reviews || []).length === 0 ? <p style={{ color: '#64748B' }}>No approved reviews yet.</p> : (
              data.reviews.map((r) => (
                <div key={r._id} style={{ padding: '12px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong>★ {r.rating}/5 {r.title ? `· ${r.title}` : ''}</strong>
                    <button type="button" onClick={() => reportReview(r._id)} style={{ border: 'none', background: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.78rem' }}>Report</button>
                  </div>
                  <p style={{ margin: '6px 0', color: '#475569' }}>{r.content}</p>
                  {(r.photos || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.photos.map((url, idx) => <img key={idx} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />)}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{r.studentId?.name || 'Student'}</div>
                </div>
              ))
            )}
          </Section>
        )}

        {tab === 'contact' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            <Section title="Contact details">
              <p>Email: {i.contact?.email || '—'}</p>
              <p>Phone: {i.contact?.phone || '—'}</p>
              <p>Website: {i.contact?.website ? <a href={i.contact.website}>{i.contact.website}</a> : '—'}</p>
              <p>{i.contact?.address}</p>
              <p>{[i.contact?.city, i.contact?.state, i.contact?.pincode, i.contact?.country].filter(Boolean).join(', ')}</p>
              {i.location?.lat != null && (
                <a href={`https://maps.google.com/?q=${i.location.lat},${i.location.lng}`} target="_blank" rel="noreferrer">Open map</a>
              )}
              {i.brochureUrl && <p><a href={i.brochureUrl} target="_blank" rel="noreferrer">Download brochure</a></p>}
              <p style={{ marginTop: 12 }}>{i.admissionInfo || ''}</p>
            </Section>
            <Section title="Contact form">
              <form onSubmit={sendContact} style={{ display: 'grid', gap: 8 }}>
                {['name', 'email', 'phone', 'subject'].map((k) => (
                  <input key={k} required={k === 'name' || k === 'email'} placeholder={k} value={contact[k]} onChange={(e) => setContact({ ...contact, [k]: e.target.value })} style={field} />
                ))}
                <textarea required rows={4} placeholder="Message" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} style={field} />
                <button type="submit" style={{ ...field, background: '#2563EB', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Send</button>
                {contactMsg && <p style={{ color: '#059669' }}>{contactMsg}</p>}
              </form>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#1E3A5F' }}>{title}</h2>
      {children}
    </section>
  )
}
function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>{children}</div>
}
function Card({ title, sub, body }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 4 }}>{sub}</div>}
      {body && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 6, whiteSpace: 'pre-wrap' }}>{body}</div>}
    </div>
  )
}
function Stat({ label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E3A5F' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{label}</div>
    </div>
  )
}
function Insight({ label, value }) {
  if (!value) return null
  return <div><strong>{label}:</strong> <span style={{ color: '#475569' }}>{value}</span></div>
}
function badge(bg) {
  return { display: 'inline-flex', padding: '2px 8px', borderRadius: 999, background: bg, color: '#0F172A', fontSize: '0.72rem', fontWeight: 800 }
}
const chip = { padding: '6px 12px', borderRadius: 999, background: '#EFF6FF', color: '#1E3A5F', fontSize: '0.8rem' }
const field = { padding: 10, borderRadius: 10, border: '1px solid #CBD5E1', font: 'inherit', width: '100%' }
