import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorState, LoadingState } from '@shared/components/ui'
import { profileApi } from '@shared/services/api'
import profileService from '@shared/services/profileService'
import StudentLayout from '../layouts/StudentLayout'
import DeviceSessions from '@shared/components/auth/DeviceSessions'
import useStudentProfile from '../hooks/useStudentProfile'
import '../styles/profile.css'

function Toggle({ value, onChange, label }) {
  return <button type="button" className={`identity-toggle ${value ? 'is-on' : ''}`} role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)}><span /></button>
}

export default function Settings() {
  const { user, profile, loading, error, load, setProfile } = useStudentProfile()
  const [privacy, setPrivacy] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setPrivacy({ ...profile.privacy })
      setPreferences({ ...profile.preferences })
    }
  }, [profile])

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const [privacyResponse, preferencesResponse] = await Promise.all([
        profileApi.privacy(privacy),
        profileApi.preferences(preferences),
      ])
      setProfile((current) => ({
        ...current,
        privacy: privacyResponse.data.privacy,
        preferences: preferencesResponse.data.preferences,
        revision: Math.max(privacyResponse.data.revision, preferencesResponse.data.revision),
      }))
      profileService.invalidate()
      setMessage('Profile settings saved.')
    } catch (requestError) {
      setMessage(requestError.userMessage || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <StudentLayout><LoadingState label="Loading profile settings…" rows={6} /></StudentLayout>
  if (error || !profile) return <StudentLayout><ErrorState title="Settings unavailable" message={error} onRetry={load} /></StudentLayout>
  if (!privacy || !preferences) return <StudentLayout><LoadingState label="Preparing profile settings…" rows={6} /></StudentLayout>

  return (
    <StudentLayout>
      <div className="identity-settings">
        <header className="identity-page-header"><div><span>Identity controls</span><h1>Profile Settings</h1><p>Manage privacy, discoverability, notifications, theme and language.</p></div></header>
        <section className="identity-panel"><header><h2>Account information</h2><Link to="/student/profile" className="btn btn-secondary">Edit profile</Link></header><dl className="settings-account"><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{user.phone || 'Not added'}</dd></div><div><dt>Public username</dt><dd>@{profile.username}</dd></div></dl></section>
        <section className="identity-panel">
          <header><div><span>Public portfolio</span><h2>Privacy</h2></div></header>
          <label className="settings-select"><span>Profile visibility<small>Private, unlisted share link, or public and discoverable</small></span><select className="select" value={privacy.visibility} onChange={(event) => setPrivacy((current) => ({ ...current, visibility: event.target.value, discoverable: event.target.value === 'public' ? current.discoverable : false }))}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
          {[['discoverable','Discoverable in search'],['showEmail','Show email'],['showPhone','Show phone'],['showAcademic','Show academic profile'],['showLearning','Show learning statistics'],['showSkills','Show skills'],['showProjects','Show projects'],['showAchievements','Show achievements'],['showCredentials','Show certificates'],['showExperience','Show experience'],['showCareer','Show career direction'],['showLinks','Show professional links']].map(([key, label]) => <div className="settings-toggle-row" key={key}><div><strong>{label}</strong><small>{key === 'discoverable' ? 'Allow people to find your public portfolio' : 'Control this section on your public portfolio'}</small></div><Toggle value={Boolean(privacy[key])} onChange={(value) => setPrivacy((current) => ({ ...current, [key]: value }))} label={label} /></div>)}
        </section>
        <section className="identity-panel">
          <header><div><span>Personal experience</span><h2>Preferences</h2></div></header>
          <div className="settings-preference-grid"><label><span>Theme</span><select className="select" value={preferences.theme} onChange={(event) => setPreferences((current) => ({ ...current, theme: event.target.value }))}><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></label><label><span>Language</span><select className="select" value={preferences.language} onChange={(event) => setPreferences((current) => ({ ...current, language: event.target.value }))}><option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="ta">Tamil</option></select></label></div>
          {[['emailNotifications','Email notifications'],['pushNotifications','Push notifications'],['weeklySummary','Weekly learning summary']].map(([key, label]) => <div className="settings-toggle-row" key={key}><div><strong>{label}</strong><small>Saved to your Dream Wave profile across devices</small></div><Toggle value={Boolean(preferences[key])} onChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))} label={label} /></div>)}
        </section>
        <DeviceSessions />
        {message && <p className="identity-settings__message" role="status">{message}</p>}
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
      </div>
    </StudentLayout>
  )
}
