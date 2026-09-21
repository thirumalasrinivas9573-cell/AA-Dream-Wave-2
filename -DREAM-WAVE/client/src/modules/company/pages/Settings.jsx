import { useEffect, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

export default function Settings() {
  const [form, setForm] = useState({ name: '', logo: '', banner: '', contact: { email: '', phone: '', website: '' } })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    companyService.getMine()
      .then((r) => {
        const c = r.data.company
        setForm({
          name: c.name || '',
          logo: c.logo || '',
          banner: c.banner || '',
          contact: {
            email: c.contact?.email || '',
            phone: c.contact?.phone || '',
            website: c.contact?.website || '',
          },
        })
      })
      .catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    try {
      await companyService.updateMine(form)
      setMsg('Settings saved')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <div>
      <CompanyPageHeader title="Settings" subtitle="Company identity and primary contact. Auth (OTP, password, sessions) stays on the login screen." />
      <form onSubmit={save} className="company-glass" style={{ maxWidth: 520 }}>
        <div className="company-form-grid">
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Display name
            <input className="company-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Logo URL
            <input className="company-input" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Banner URL
            <input className="company-input" value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} />
          </label>
          {['email', 'phone', 'website'].map((k) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
              {k}
              <input className="company-input" value={form.contact[k]} onChange={(e) => setForm({ ...form, contact: { ...form.contact, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        {msg && <p style={{ color: '#34D399' }}>{msg}</p>}
        {error && <p role="alert" style={{ color: '#F87171' }}>{error}</p>}
        <button type="submit" className="company-btn company-btn-primary" style={{ marginTop: 12 }}>Save settings</button>
      </form>
    </div>
  )
}
