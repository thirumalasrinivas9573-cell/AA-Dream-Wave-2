import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { discoveryApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import { DiscoverySection, DiscoveryCard } from '../components/DiscoverySection'

export default function DiscoveryPage() {
  const { user } = useAuth()
  const [home, setHome] = useState(null)
  const [feed, setFeed] = useState([])
  const [filter, setFilter] = useState('')
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    discoveryApi.home()
      .then((r) => setHome(r.data.home))
      .catch(() => setHome(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    discoveryApi.feed({ category: filter || undefined, limit: 24 })
      .then((r) => setFeed(r.data.items || []))
      .catch(() => setFeed([]))
  }, [filter])

  useEffect(() => {
    if (!user) return
    discoveryApi.recommendations()
      .then((r) => setRecs(r.data))
      .catch(() => setRecs(null))
  }, [user])

  const h = home || {}

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F1A', color: '#E2E8F0', padding: '32px 20px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#94A3B8', fontSize: '0.85rem' }}>← Portals</Link>
        <h1 style={{ margin: '14px 0 6px', fontSize: 'clamp(1.6rem,3vw,2.2rem)' }}>Dream Wave Discovery</h1>
        <p style={{ opacity: 0.7, marginBottom: 16, maxWidth: 640 }}>
          One intelligent surface for institutions, companies, careers, books, research, and events — live data only.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          <Link to="/search" style={chip}>Global search</Link>
          <Link to="/institutions" style={chip}>Institutions</Link>
          <Link to="/companies" style={chip}>Companies</Link>
          <Link to="/library" style={chip}>Knowledge Center</Link>
          {user && <Link to="/notifications" style={chip}>Notifications</Link>}
        </div>

        {loading && <p style={{ color: '#94A3B8' }}>Loading discovery…</p>}

        {user && recs?.recommendations && (
          <>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: 8 }}>AI recommended · {recs.reason}</p>
            <DiscoverySection title="AI recommended for you">
              {(recs.recommendations.institutions || []).slice(0, 4).map((i) => (
                <DiscoveryCard key={i._id} to={`/institutions/${i.slug}`} title={i.name} meta="Institution" badge="AI" />
              ))}
              {(recs.recommendations.companies || []).slice(0, 4).map((c) => (
                <DiscoveryCard key={c._id} to={`/companies/${c.slug}`} title={c.name} meta="Company" badge="AI" />
              ))}
              {(recs.recommendations.jobs || []).slice(0, 4).map((j) => (
                <DiscoveryCard key={j._id} to={j.companyId?.slug ? `/companies/${j.companyId.slug}` : '/companies'} title={j.title} meta="Job" badge="AI" />
              ))}
              {(recs.recommendations.books || []).slice(0, 4).map((b) => (
                <DiscoveryCard key={b._id} to={`/library/books/${b._id}`} title={b.title} meta={b.author} badge="AI" />
              ))}
            </DiscoverySection>
          </>
        )}

        <DiscoverySection title="Trending institutions" action={<Link to="/institutions" style={linkMore}>Browse</Link>} empty="No public institutions yet.">
          {(h.trendingInstitutions || []).map((i) => (
            <DiscoveryCard key={i._id} to={`/institutions/${i.slug}`} title={i.name} meta={`${i.stats?.followers || 0} followers · AI ${i.stats?.aiRating ?? 0}`} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Trending companies" action={<Link to="/companies" style={linkMore}>Browse</Link>} empty="No public companies yet.">
          {(h.trendingCompanies || []).map((c) => (
            <DiscoveryCard key={c._id} to={`/companies/${c.slug}`} title={c.name} meta={`${c.industry || 'Company'} · ${c.stats?.followers || 0} followers`} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Latest jobs" empty="No open jobs yet.">
          {(h.latestJobs || []).map((j) => (
            <DiscoveryCard
              key={j._id}
              to={j.companyId?.slug ? `/companies/${j.companyId.slug}` : '/search?type=jobs'}
              title={j.title}
              meta={[j.companyId?.name, j.location, j.workMode].filter(Boolean).join(' · ')}
            />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Latest internships" empty="No open internships yet.">
          {(h.latestInternships || []).map((j) => (
            <DiscoveryCard
              key={j._id}
              to={j.companyId?.slug ? `/companies/${j.companyId.slug}` : '/search?type=internships'}
              title={j.title}
              meta={[j.companyId?.name, j.duration, j.stipend ? `₹${j.stipend}` : null].filter(Boolean).join(' · ')}
            />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Featured books" action={<Link to="/library" style={linkMore}>Library</Link>} empty="No licensed books yet.">
          {(h.featuredBooks || []).map((b) => (
            <DiscoveryCard key={b._id} to={`/library/books/${b._id}`} title={b.title} meta={`${b.author || ''} · ${b.category || ''}`} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Popular courses" empty="No courses published yet.">
          {(h.popularCourses || []).map((c) => (
            <DiscoveryCard key={c._id} title={c.title} meta={c.fees != null ? `Fees ₹${c.fees}` : 'Course'} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Upcoming events" empty="No upcoming events.">
          {(h.upcomingEvents || []).map((e) => (
            <DiscoveryCard key={e._id} title={e.title} meta={`${e.type} · ${e.startDate ? new Date(e.startDate).toLocaleDateString() : ''}`} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Scholarships" empty="No open scholarships.">
          {(h.scholarships || []).map((s) => (
            <DiscoveryCard key={s._id} title={s.title} meta={[s.amount, s.deadline ? `Due ${new Date(s.deadline).toLocaleDateString()}` : null].filter(Boolean).join(' · ')} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Hackathons" empty="No hackathons listed.">
          {(h.hackathons || []).map((e) => (
            <DiscoveryCard key={e._id} title={e.title} meta={e.startDate ? new Date(e.startDate).toLocaleDateString() : 'Hackathon'} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Competitions" empty="No competitions listed.">
          {(h.competitions || []).map((e) => (
            <DiscoveryCard key={e._id} title={e.title} meta={e.type} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Research" empty="No research published.">
          {(h.research || []).map((r) => (
            <DiscoveryCard key={r._id} title={r.title} meta={[r.authors, r.year].filter(Boolean).join(' · ')} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Learning paths" action={<Link to="/library" style={linkMore}>Explore</Link>} empty="No learning paths yet.">
          {(h.learningPaths || []).map((c) => (
            <DiscoveryCard key={c._id} to={`/library/collections/${c._id}`} title={c.title} meta={c.type} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Recently added" empty="No promotions yet.">
          {(h.recentlyAdded || []).map((p) => (
            <DiscoveryCard key={p._id} to={`/discover/${p._id}`} title={p.title} meta={p.category} />
          ))}
        </DiscoverySection>

        <DiscoverySection title="Editor's picks" empty="No editor picks yet.">
          {(h.editorsPicks || []).map((p) => (
            <DiscoveryCard key={p._id} to={`/discover/${p._id}`} title={p.title} meta={`${p.engagement || 0} engagement`} badge="Editor" />
          ))}
        </DiscoverySection>

        <section style={{ marginTop: 12, marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.15rem' }}>Promotion feed</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 16px' }}>
            {['', ...(h.feedCategories || [])].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                onClick={() => setFilter(c)}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: '1px solid #334155', cursor: 'pointer',
                  background: filter === c ? '#38BDF8' : 'transparent',
                  color: filter === c ? '#0F172A' : '#CBD5E1',
                }}
              >
                {c || 'All'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {feed.length === 0 ? <p style={{ color: '#64748B' }}>No promotions in this category.</p> : feed.map((p) => (
              <Link key={p._id} to={`/discover/${p._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ padding: 16, borderRadius: 14, background: 'rgba(15,23,42,0.9)', border: '1px solid #1E293B' }}>
                  <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginBottom: 6 }}>{p.category} · {p.ownerName}</div>
                  <h3 style={{ margin: '0 0 8px' }}>{p.title}</h3>
                  <p style={{ margin: 0, opacity: 0.75, fontSize: '0.9rem' }}>{p.content}</p>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

const chip = {
  padding: '8px 14px', borderRadius: 20, border: '1px solid #334155', color: '#CBD5E1',
  textDecoration: 'none', fontSize: '0.85rem',
}
const linkMore = { color: '#38BDF8', fontSize: '0.85rem', textDecoration: 'none' }
