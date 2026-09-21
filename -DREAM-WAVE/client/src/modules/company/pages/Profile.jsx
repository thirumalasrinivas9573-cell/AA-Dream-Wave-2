import { useEffect, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

const empty = {
  name: '', logo: '', banner: '', about: '', mission: '', vision: '',
  history: '', founderMessage: '', ceoMessage: '', culture: '', officeTour: '',
  businessType: '', industry: '', companySize: '', foundedYear: '',
  techStack: '', isPublic: true,
  contact: { email: '', phone: '', website: '', address: '', city: '', state: '', country: '' },
  social: { linkedin: '', twitter: '', facebook: '', instagram: '', youtube: '' },
  careers: {
    overview: '', whyJoin: '', benefits: '', learningPrograms: '',
    training: '', employeeGrowth: '', promotionPolicy: '',
  },
  branches: '',
  offices: '',
}

export default function Profile() {
  const [form, setForm] = useState(empty)
  const [slug, setSlug] = useState('')
  const [completion, setCompletion] = useState(0)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    companyService.getMine()
      .then((r) => {
        const c = r.data.company
        setSlug(c.slug || '')
        setCompletion(r.data.profileCompletion || 0)
        setForm({
          name: c.name || '',
          logo: c.logo || '',
          banner: c.banner || '',
          about: c.about || '',
          mission: c.mission || '',
          vision: c.vision || '',
          history: c.history || '',
          founderMessage: c.founderMessage || '',
          ceoMessage: c.ceoMessage || '',
          culture: c.culture || '',
          officeTour: c.officeTour || '',
          businessType: c.businessType || '',
          industry: c.industry || '',
          companySize: c.companySize || '',
          foundedYear: c.foundedYear ?? '',
          techStack: (c.techStack || []).join(', '),
          isPublic: c.isPublic !== false,
          contact: { ...empty.contact, ...(c.contact || {}) },
          social: { ...empty.social, ...(c.social || {}) },
          careers: { ...empty.careers, ...(c.careers || {}) },
          branches: (c.branches || []).map((b) => `${b.name || ''}|${b.city || ''}|${b.address || ''}`).join('\n'),
          offices: (c.offices || []).map((o) => `${o.city || ''}|${o.country || ''}|${o.address || ''}`).join('\n'),
        })
      })
      .catch(() => companyService.bootstrap())
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setMsg('')
    setError('')
    try {
      const payload = {
        name: form.name,
        logo: form.logo,
        banner: form.banner,
        about: form.about,
        mission: form.mission,
        vision: form.vision,
        history: form.history,
        founderMessage: form.founderMessage,
        ceoMessage: form.ceoMessage,
        culture: form.culture,
        officeTour: form.officeTour,
        businessType: form.businessType,
        industry: form.industry,
        companySize: form.companySize,
        foundedYear: form.foundedYear === '' ? null : Number(form.foundedYear),
        techStack: form.techStack.split(',').map((s) => s.trim()).filter(Boolean),
        isPublic: form.isPublic,
        contact: form.contact,
        social: form.social,
        careers: form.careers,
        branches: form.branches.split('\n').map((line) => {
          const [name, city, address] = line.split('|')
          return { name: (name || '').trim(), city: (city || '').trim(), address: (address || '').trim() }
        }).filter((b) => b.name || b.city),
        offices: form.offices.split('\n').map((line) => {
          const [city, country, address] = line.split('|')
          return { city: (city || '').trim(), country: (country || '').trim(), address: (address || '').trim() }
        }).filter((o) => o.city),
      }
      const { data } = await companyService.updateMine(payload)
      setSlug(data.company?.slug || slug)
      setCompletion(data.profileCompletion || completion)
      setMsg('Company profile saved')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  const publicUrl = slug ? `/companies/${slug}` : null

  return (
    <div>
      <CompanyPageHeader
        title="Company Profile"
        subtitle={`Profile completion ${completion}% — public careers page, culture, and hiring brand.`}
        actions={publicUrl ? <a className="company-btn company-btn-secondary" href={publicUrl} style={{ textDecoration: 'none' }}>View {publicUrl}</a> : null}
      />
      <form onSubmit={save} className="company-glass" style={{ maxWidth: 820 }}>
        <div className="company-form-grid">
          <label className="full" style={lab}>Company name<input className="company-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label style={lab}>Business type<input className="company-input" value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} /></label>
          <label style={lab}>Industry<input className="company-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label>
          <label style={lab}>Company size
            <select className="company-input" value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
              <option value="">Select</option>
              {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={lab}>Founded year<input className="company-input" type="number" value={form.foundedYear} onChange={(e) => setForm({ ...form, foundedYear: e.target.value })} /></label>
          {['logo', 'banner'].map((k) => (
            <label key={k} className="full" style={lab}>{k} URL<input className="company-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
          ))}
          {['about', 'mission', 'vision', 'history', 'culture', 'founderMessage', 'ceoMessage', 'officeTour'].map((k) => (
            <label key={k} className="full" style={lab}>{k}<textarea className="company-input" rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
          ))}
          <label className="full" style={lab}>Technology stack (comma-separated)
            <input className="company-input" value={form.techStack} onChange={(e) => setForm({ ...form, techStack: e.target.value })} />
          </label>
          <label className="full" style={lab}>Branches (name|city|address)
            <textarea className="company-input" rows={3} value={form.branches} onChange={(e) => setForm({ ...form, branches: e.target.value })} />
          </label>
          <label className="full" style={lab}>Offices / locations (city|country|address)
            <textarea className="company-input" rows={3} value={form.offices} onChange={(e) => setForm({ ...form, offices: e.target.value })} />
          </label>
        </div>

        <h3 style={{ color: '#93C5FD' }}>Careers page</h3>
        <div className="company-form-grid">
          {Object.keys(empty.careers).map((k) => (
            <label key={k} className="full" style={lab}>{k}
              <textarea className="company-input" rows={2} value={form.careers[k] || ''} onChange={(e) => setForm({ ...form, careers: { ...form.careers, [k]: e.target.value } })} />
            </label>
          ))}
        </div>

        <h3 style={{ color: '#93C5FD' }}>Contact</h3>
        <div className="company-form-grid">
          {['email', 'phone', 'website', 'address', 'city', 'state', 'country'].map((k) => (
            <label key={k} style={lab}>{k}
              <input className="company-input" value={form.contact[k] || ''} onChange={(e) => setForm({ ...form, contact: { ...form.contact, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        <h3 style={{ color: '#93C5FD' }}>Social media</h3>
        <div className="company-form-grid">
          {['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'].map((k) => (
            <label key={k} style={lab}>{k}
              <input className="company-input" value={form.social[k] || ''} onChange={(e) => setForm({ ...form, social: { ...form.social, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
          Public company profile visible at /companies/{'{slug}'}
        </label>
        {msg && <p style={{ color: '#34D399' }}>{msg}</p>}
        {error && <p role="alert" style={{ color: '#F87171' }}>{error}</p>}
        <button type="submit" className="company-btn company-btn-primary" style={{ marginTop: 12 }}>Save profile</button>
      </form>
    </div>
  )
}

const lab = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }
