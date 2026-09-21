import { useEffect, useState } from 'react'
import InstPageHeader from '../components/InstPageHeader'
import { institutionService } from '../services/api'
import { INSTITUTION_THEME } from '../theme'

export default function Settings() {
  const t = INSTITUTION_THEME
  const [form, setForm] = useState({
    name: '',
    logo: '',
    banner: '',
    contact: { email: '', phone: '', website: '' },
  })
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    institutionService.getMine()
      .then((r) => {
        const i = r.data.institution
        setForm({
          name: i.name || '',
          logo: i.logo || '',
          banner: i.banner || '',
          contact: {
            email: i.contact?.email || '',
            phone: i.contact?.phone || '',
            website: i.contact?.website || '',
          },
        })
      })
      .catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      await institutionService.updateMine(form)
      setMsg('Settings saved')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <div>
      <InstPageHeader title="Settings" subtitle="Institution identity and primary contact details." />
      <form onSubmit={save} className="inst-card" style={{ maxWidth: 560 }}>
        <div className="inst-form-grid">
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Display name
            <input className="inst-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Logo URL
            <input className="inst-input" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} />
          </label>
          <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
            Banner URL
            <input className="inst-input" value={form.banner} onChange={(e) => setForm({ ...form, banner: e.target.value })} />
          </label>
          {['email', 'phone', 'website'].map((k) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
              Contact {k}
              <input
                className="inst-input"
                value={form.contact[k]}
                onChange={(e) => setForm({ ...form, contact: { ...form.contact, [k]: e.target.value } })}
              />
            </label>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: t.muted, marginTop: 14 }}>
          Password reset, OTP, and sessions are managed through Dream Wave authentication on the login screen.
        </p>
        {msg && <p style={{ color: t.emerald }}>{msg}</p>}
        {error && <p role="alert" style={{ color: '#DC2626' }}>{error}</p>}
        <button type="submit" className="inst-btn inst-btn-primary" style={{ marginTop: 10 }}>Save settings</button>
      </form>
    </div>
  )
}
