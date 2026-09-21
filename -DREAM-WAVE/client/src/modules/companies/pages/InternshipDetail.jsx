import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { companyApi, interactionApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import SeoHead from '../components/SeoHead'

export default function PublicInternshipDetail() {
  const { internshipId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    companyApi.publicInternship(internshipId).then((r) => setData(r.data)).catch(() => setData(null))
  }, [internshipId])

  const apply = async () => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.applyInternship(internshipId, {})
      setMsg('Application submitted')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Apply failed')
    }
  }

  if (!data) return <div style={{ padding: 40, color: '#64748B' }}>Loading internship…</div>
  const i = data.internship
  const c = data.company

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', padding: '28px 16px 60px' }}>
      <SeoHead
        title={`${i.title} Internship at ${c.name} | Dream Wave`}
        description={(i.description || `${i.title} — ${c.name}`).slice(0, 160)}
        canonical={`/companies/internships/${i._id}`}
      />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to={`/companies/${c.slug}`} style={{ color: '#64748B' }}>← {c.name}</Link>
        <h1 style={{ margin: '12px 0 6px', color: '#1E3A8A' }}>{i.title}</h1>
        <p style={{ color: '#64748B' }}>{[i.duration, i.location, i.workMode, i.stipend ? `Stipend ₹${i.stipend}` : null].filter(Boolean).join(' · ')}</p>
        <button type="button" onClick={apply} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 800, cursor: 'pointer', margin: '12px 0' }}>Apply</button>
        {msg && <p style={{ color: '#2563EB' }}>{msg}</p>}
        <article style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, lineHeight: 1.7 }}>
          <p>{i.description || '—'}</p>
          {i.eligibility && <p><strong>Eligibility:</strong> {i.eligibility}</p>}
          {i.projects && <p><strong>Projects:</strong> {i.projects}</p>}
          <p><strong>Certificate:</strong> {i.certificate ? 'Yes' : 'No'}</p>
          <p><strong>Conversion opportunity:</strong> {i.conversionOpportunity ? 'Yes' : 'Not listed'}</p>
          {(i.skills || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {i.skills.map((s) => <span key={s} style={{ padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1E3A8A', fontSize: '0.75rem' }}>{s}</span>)}
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
