import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { companyApi, interactionApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import SeoHead from '../components/SeoHead'

export default function PublicJobDetail() {
  const { jobId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    companyApi.publicJob(jobId).then((r) => setData(r.data)).catch(() => setData(null))
  }, [jobId])

  const apply = async () => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.applyJob(jobId, {})
      setMsg('Application submitted')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Apply failed')
    }
  }

  const save = async () => {
    if (!user) { window.location.href = '/student/login'; return }
    try {
      await interactionApi.bookmark({ targetType: 'job', targetId: jobId })
      setMsg('Job saved')
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed')
    }
  }

  if (!data) return <div style={{ padding: 40, color: '#64748B' }}>Loading job…</div>
  const j = data.job
  const c = data.company

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', padding: '28px 16px 60px' }}>
      <SeoHead
        title={`${j.title} at ${c.name} | Dream Wave`}
        description={(j.description || `${j.title} — ${c.name}`).slice(0, 160)}
        canonical={`/companies/jobs/${j._id}`}
      />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to={`/companies/${c.slug}`} style={{ color: '#64748B' }}>← {c.name}</Link>
        <h1 style={{ margin: '12px 0 6px', color: '#1E3A8A' }}>{j.title}</h1>
        <p style={{ color: '#64748B' }}>{[j.department || j.category, j.location, j.workMode, j.type].filter(Boolean).join(' · ')}</p>
        {(j.salaryMin || j.salaryMax) ? <p>Salary: ₹{j.salaryMin || 0} – ₹{j.salaryMax || 0}</p> : null}
        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          <button type="button" onClick={apply} style={pri}>Apply</button>
          <button type="button" onClick={save} style={sec}>Save job</button>
        </div>
        {msg && <p style={{ color: '#2563EB' }}>{msg}</p>}
        <article style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, lineHeight: 1.7 }}>
          <h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Description</h2>
          <p>{j.description || '—'}</p>
          {j.education && <><h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Education</h2><p>{j.education}</p></>}
          {j.experience && <><h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Experience</h2><p>{j.experience}</p></>}
          {j.responsibilities && <><h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Responsibilities</h2><p>{j.responsibilities}</p></>}
          {j.benefits && <><h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Benefits</h2><p>{j.benefits}</p></>}
          {j.hiringProcess && <><h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Hiring process</h2><p>{j.hiringProcess}</p></>}
          {(j.skills || []).length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', color: '#1E3A8A' }}>Required skills</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{j.skills.map((s) => <span key={s} style={tag}>{s}</span>)}</div>
            </>
          )}
          {j.deadline && <p><strong>Application deadline:</strong> {new Date(j.deadline).toLocaleDateString()}</p>}
        </article>
      </div>
    </div>
  )
}

const pri = { padding: '10px 16px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 800, cursor: 'pointer' }
const sec = { padding: '10px 16px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#fff', cursor: 'pointer', fontWeight: 700 }
const tag = { padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1E3A8A', fontSize: '0.75rem' }
