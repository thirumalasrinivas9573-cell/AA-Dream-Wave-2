import { useEffect, useState } from 'react'
import InstPageHeader from '../components/InstPageHeader'
import { institutionService } from '../services/api'
import { INSTITUTION_THEME } from '../theme'

const empty = {
  name: '', logo: '', banner: '', about: '', mission: '', vision: '', history: '',
  admissionInfo: '', brochureUrl: '', isPublic: true,
  institutionType: 'college', establishedYear: '', ranking: '',
  academicCalendar: '', placementTimeline: '', internshipsInfo: '',
  leadership: { chairmanMessage: '', principalMessage: '', directorMessage: '' },
  campus: {
    laboratories: '', library: '', hostels: '', sports: '', transportation: '', cafeteria: '', medical: '',
    hostelAvailable: false,
  },
  location: { lat: '', lng: '' },
  contact: { email: '', phone: '', website: '', address: '', city: '', state: '', country: '', pincode: '' },
  social: { linkedin: '', twitter: '', facebook: '', instagram: '', youtube: '' },
  facilities: '',
  achievements: '',
  recruiters: '',
}

export default function Profile() {
  const t = INSTITUTION_THEME
  const [form, setForm] = useState(empty)
  const [slug, setSlug] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    institutionService.getMine()
      .then((r) => {
        const i = r.data.institution
        setSlug(i.slug || '')
        setForm({
          name: i.name || '',
          logo: i.logo || '',
          banner: i.banner || '',
          about: i.about || '',
          mission: i.mission || '',
          vision: i.vision || '',
          history: i.history || '',
          admissionInfo: i.admissionInfo || '',
          brochureUrl: i.brochureUrl || '',
          isPublic: i.isPublic !== false,
          institutionType: i.institutionType || 'college',
          establishedYear: i.establishedYear ?? '',
          ranking: i.ranking ?? '',
          academicCalendar: i.academicCalendar || '',
          placementTimeline: i.placementTimeline || '',
          internshipsInfo: i.internshipsInfo || '',
          leadership: { ...empty.leadership, ...(i.leadership || {}) },
          campus: { ...empty.campus, ...(i.campus || {}) },
          location: {
            lat: i.location?.lat ?? '',
            lng: i.location?.lng ?? '',
          },
          contact: { ...empty.contact, ...(i.contact || {}) },
          social: { ...empty.social, ...(i.social || {}) },
          facilities: (i.facilities || []).join('\n'),
          achievements: (i.achievements || []).map((a) => `${a.title || ''}|${a.year || ''}|${a.description || ''}`).join('\n'),
          recruiters: (i.recruiters || []).map((r) => `${r.name || ''}|${r.logo || ''}|${r.package || ''}`).join('\n'),
        })
      })
      .catch(() => institutionService.bootstrap())
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
        admissionInfo: form.admissionInfo,
        brochureUrl: form.brochureUrl,
        isPublic: form.isPublic,
        institutionType: form.institutionType,
        establishedYear: form.establishedYear === '' ? null : Number(form.establishedYear),
        ranking: form.ranking === '' ? null : Number(form.ranking),
        academicCalendar: form.academicCalendar,
        placementTimeline: form.placementTimeline,
        internshipsInfo: form.internshipsInfo,
        leadership: form.leadership,
        campus: {
          ...form.campus,
          hostelAvailable: Boolean(form.campus.hostelAvailable),
        },
        location: {
          lat: form.location.lat === '' ? undefined : Number(form.location.lat),
          lng: form.location.lng === '' ? undefined : Number(form.location.lng),
        },
        contact: form.contact,
        social: form.social,
        facilities: form.facilities.split('\n').map((s) => s.trim()).filter(Boolean),
        achievements: form.achievements.split('\n').map((line) => {
          const [title, year, description] = line.split('|')
          return { title: (title || '').trim(), year: (year || '').trim(), description: (description || '').trim() }
        }).filter((a) => a.title),
        recruiters: form.recruiters.split('\n').map((line) => {
          const [name, logo, pkg] = line.split('|')
          return { name: (name || '').trim(), logo: (logo || '').trim(), package: (pkg || '').trim() }
        }).filter((r) => r.name),
      }
      const { data } = await institutionService.updateMine(payload)
      setSlug(data.institution?.slug || slug)
      setMsg('Public profile saved')
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  const setContact = (k, v) => setForm((f) => ({ ...f, contact: { ...f.contact, [k]: v } }))
  const setSocial = (k, v) => setForm((f) => ({ ...f, social: { ...f.social, [k]: v } }))
  const setLeadership = (k, v) => setForm((f) => ({ ...f, leadership: { ...f.leadership, [k]: v } }))
  const setCampus = (k, v) => setForm((f) => ({ ...f, campus: { ...f.campus, [k]: v } }))

  return (
    <div>
      <InstPageHeader
        title="Public Profile"
        subtitle="Manage the public discovery profile students see at /institutions/{slug}."
        actions={slug ? <a className="inst-btn" href={`/institutions/${slug}`} style={{ textDecoration: 'none' }}>View /institutions/{slug}</a> : null}
      />
      <form onSubmit={save} className="inst-card" style={{ maxWidth: 860 }}>
        <div className="inst-form-grid">
          <label className="full" style={lab}>Institution name
            <input className="inst-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label style={lab}>Type
            <select className="inst-input" value={form.institutionType} onChange={(e) => setForm({ ...form, institutionType: e.target.value })}>
              {['university', 'engineering', 'medical', 'college', 'school', 'training', 'bootcamp', 'other'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label style={lab}>Established year
            <input className="inst-input" type="number" value={form.establishedYear} onChange={(e) => setForm({ ...form, establishedYear: e.target.value })} />
          </label>
          <label style={lab}>Ranking #
            <input className="inst-input" type="number" value={form.ranking} onChange={(e) => setForm({ ...form, ranking: e.target.value })} />
          </label>
          {['logo', 'banner', 'brochureUrl'].map((k) => (
            <label key={k} className="full" style={lab}>{k}
              <input className="inst-input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          {['about', 'mission', 'vision', 'history', 'admissionInfo', 'academicCalendar', 'placementTimeline', 'internshipsInfo'].map((k) => (
            <label key={k} className="full" style={lab}>{k}
              <textarea className="inst-input" rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
        </div>

        <h3 style={{ margin: '18px 0 10px', color: t.accent }}>Leadership messages</h3>
        <div className="inst-form-grid">
          {['chairmanMessage', 'principalMessage', 'directorMessage'].map((k) => (
            <label key={k} className="full" style={lab}>{k}
              <textarea className="inst-input" rows={2} value={form.leadership[k]} onChange={(e) => setLeadership(k, e.target.value)} />
            </label>
          ))}
        </div>

        <h3 style={{ margin: '18px 0 10px', color: t.accent }}>Campus</h3>
        <div className="inst-form-grid">
          {['laboratories', 'library', 'hostels', 'sports', 'transportation', 'cafeteria', 'medical'].map((k) => (
            <label key={k} className="full" style={lab}>{k}
              <textarea className="inst-input" rows={2} value={form.campus[k]} onChange={(e) => setCampus(k, e.target.value)} />
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.campus.hostelAvailable} onChange={(e) => setCampus('hostelAvailable', e.target.checked)} />
            Hostel available
          </label>
        </div>

        <h3 style={{ margin: '18px 0 10px', color: t.accent }}>Map coordinates</h3>
        <div className="inst-form-grid">
          <label style={lab}>Latitude<input className="inst-input" value={form.location.lat} onChange={(e) => setForm({ ...form, location: { ...form.location, lat: e.target.value } })} /></label>
          <label style={lab}>Longitude<input className="inst-input" value={form.location.lng} onChange={(e) => setForm({ ...form, location: { ...form.location, lng: e.target.value } })} /></label>
        </div>

        <label className="full" style={{ ...lab, marginTop: 12 }}>Facilities (one per line)
          <textarea className="inst-input" rows={3} value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
        </label>
        <label className="full" style={lab}>Achievements (title|year|description)
          <textarea className="inst-input" rows={3} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} />
        </label>
        <label className="full" style={lab}>Recruiters (name|logoUrl|package)
          <textarea className="inst-input" rows={3} value={form.recruiters} onChange={(e) => setForm({ ...form, recruiters: e.target.value })} />
        </label>

        <h3 style={{ margin: '18px 0 10px', color: t.accent }}>Contact</h3>
        <div className="inst-form-grid">
          {['email', 'phone', 'website', 'address', 'city', 'state', 'country', 'pincode'].map((k) => (
            <label key={k} style={lab}>{k}
              <input className="inst-input" value={form.contact[k] || ''} onChange={(e) => setContact(k, e.target.value)} />
            </label>
          ))}
        </div>

        <h3 style={{ margin: '18px 0 10px', color: t.accent }}>Social links</h3>
        <div className="inst-form-grid">
          {['linkedin', 'twitter', 'facebook', 'instagram', 'youtube'].map((k) => (
            <label key={k} style={lab}>{k}
              <input className="inst-input" value={form.social[k] || ''} onChange={(e) => setSocial(k, e.target.value)} />
            </label>
          ))}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: '0.9rem' }}>
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
          Public profile visible in Discovery
        </label>

        {msg && <p style={{ color: t.emerald }}>{msg}</p>}
        {error && <p role="alert" style={{ color: '#DC2626' }}>{error}</p>}
        <button type="submit" className="inst-btn inst-btn-primary" style={{ marginTop: 12 }}>Save public profile</button>
      </form>
    </div>
  )
}

const lab = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }
