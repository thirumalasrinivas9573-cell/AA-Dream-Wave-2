import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorState, LoadingState } from '@shared/components/ui'
import { profileApi } from '@shared/services/api'
import profileService from '@shared/services/profileService'
import StudentLayout from '../layouts/StudentLayout'
import DeviceSessions from '@shared/components/auth/DeviceSessions'
import useStudentProfile from '../hooks/useStudentProfile'
import { useTheme } from '@shared/context/ThemeContext'
import ThemeToggle from '@shared/components/ThemeToggle'
import '../styles/profile.css'

function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none ${
        value ? 'bg-brand-primary' : 'bg-surface-elevated border border-divider'
      }`}
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
    >
      <span
        className={`inline-block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out mt-1 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user, profile, loading, error, load, setProfile } = useStudentProfile()
  const { themePreference, setThemePreference } = useTheme()
  const [privacy, setPrivacy] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setPrivacy({ ...profile.privacy })
      setPreferences({
        ...profile.preferences,
        theme: themePreference || profile.preferences?.theme || 'delulu-daylight',
      })
    }
  }, [profile, themePreference])

  const handleThemeChange = (newTheme) => {
    setThemePreference(newTheme)
    setPreferences((current) => ({ ...current, theme: newTheme }))
  }

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
      setMessage('Profile settings saved successfully.')
    } catch (requestError) {
      setMessage(requestError.userMessage || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <StudentLayout>
        <LoadingState label="Loading profile settings…" rows={6} />
      </StudentLayout>
    )
  if (error || !profile)
    return (
      <StudentLayout>
        <ErrorState title="Settings unavailable" message={error} onRetry={load} />
      </StudentLayout>
    )
  if (!privacy || !preferences)
    return (
      <StudentLayout>
        <LoadingState label="Preparing profile settings…" rows={6} />
      </StudentLayout>
    )

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              IDENTITY CONTROLS
            </span>
            <h1 className="text-3xl font-heading font-bold text-content-heading tracking-tight mt-1">
              Profile Settings
            </h1>
            <p className="text-sm text-content-muted">
              Manage privacy, discoverability, notifications, appearance theme, and language preferences.
            </p>
          </div>
          <Link
            to="/student/profile"
            className="h-10 px-4 rounded-xl inline-flex items-center gap-2 text-xs font-semibold text-content-heading bg-surface border border-divider hover:border-brand-primary transition-all self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px] text-brand-primary">person</span>
            <span>View Public Profile</span>
          </Link>
        </header>

        {/* Account Info */}
        <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-content-heading">Account Information</h2>
            <Link to="/student/profile" className="text-xs font-semibold text-brand-primary hover:underline">
              Edit in Profile
            </Link>
          </header>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-canvas border border-divider">
              <dt className="text-content-muted font-medium">Name</dt>
              <dd className="font-bold text-content-heading mt-0.5">{user.name}</dd>
            </div>
            <div className="p-3 rounded-xl bg-canvas border border-divider">
              <dt className="text-content-muted font-medium">Email</dt>
              <dd className="font-bold text-content-heading mt-0.5">{user.email}</dd>
            </div>
            <div className="p-3 rounded-xl bg-canvas border border-divider">
              <dt className="text-content-muted font-medium">Phone</dt>
              <dd className="font-bold text-content-heading mt-0.5">{user.phone || 'Not added'}</dd>
            </div>
            <div className="p-3 rounded-xl bg-canvas border border-divider">
              <dt className="text-content-muted font-medium">Public Username</dt>
              <dd className="font-bold text-brand-primary mt-0.5">@{profile.username}</dd>
            </div>
          </dl>
        </section>

        {/* Privacy Settings */}
        <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">PUBLIC PORTFOLIO</span>
            <h2 className="font-heading font-bold text-lg text-content-heading">Privacy & Discoverability</h2>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-divider space-y-2">
            <label className="text-xs font-bold text-content-heading block">Profile Visibility</label>
            <p className="text-xs text-content-muted">Control whether your portfolio is private, unlisted, or publicly discoverable.</p>
            <select
              className="w-full h-10 px-3 rounded-xl bg-surface border border-divider text-xs font-semibold text-content-heading focus:outline-none focus:border-brand-primary cursor-pointer"
              value={privacy.visibility}
              onChange={(event) =>
                setPrivacy((current) => ({
                  ...current,
                  visibility: event.target.value,
                  discoverable: event.target.value === 'public' ? current.discoverable : false,
                }))
              }
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted (Share link only)</option>
              <option value="public">Public & Discoverable</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            {[
              ['discoverable', 'Discoverable in search', 'Allow people to find your public portfolio'],
              ['showEmail', 'Show email', 'Display email address on public portfolio'],
              ['showPhone', 'Show phone', 'Display phone number on public portfolio'],
              ['showAcademic', 'Show academic profile', 'Display degree and institution information'],
              ['showLearning', 'Show learning statistics', 'Display completed goals and tasks overview'],
              ['showSkills', 'Show skills', 'Display verified skills and endorsement badges'],
              ['showProjects', 'Show projects', 'Display featured portfolio projects'],
              ['showAchievements', 'Show achievements', 'Display badges and honors timeline'],
              ['showCredentials', 'Show certificates', 'Display verified credentials and certs'],
              ['showExperience', 'Show experience', 'Display work and internship history'],
              ['showCareer', 'Show career direction', 'Display target roles and aspirations'],
              ['showLinks', 'Show professional links', 'Display GitHub, LinkedIn, and website links'],
            ].map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-divider">
                <div className="pr-4">
                  <div className="text-xs font-bold text-content-heading">{label}</div>
                  <div className="text-[11px] text-content-muted">{desc}</div>
                </div>
                <Toggle
                  value={Boolean(privacy[key])}
                  onChange={(value) => setPrivacy((current) => ({ ...current, [key]: value }))}
                  label={label}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Preferences & Theme Section */}
        <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
          <div>
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">PERSONAL EXPERIENCE</span>
            <h2 className="font-heading font-bold text-lg text-content-heading">Preferences & Themes</h2>
          </div>

          {/* Theme Selector */}
          <div className="p-4 rounded-xl bg-canvas border border-divider space-y-3">
            <span className="text-xs font-bold text-content-heading block">Stitch Theme Matrix (4 Themes)</span>
            <ThemeToggle variant="segmented" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-content-heading block">Selected Theme Mode</label>
              <select
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-divider text-xs font-semibold text-content-heading focus:outline-none focus:border-brand-primary cursor-pointer"
                value={preferences.theme || themePreference}
                onChange={(event) => handleThemeChange(event.target.value)}
              >
                <option value="delulu-daylight">Delulu Daylight (Luminous Sky White)</option>
                <option value="barely-working">Barely Working (Restful Dark Slate)</option>
                <option value="green-flag-energy">Green Flag Energy (Sunlit Bio-Mint)</option>
                <option value="midnight-intelligence">Midnight Intelligence (Command Deck Dark)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-content-heading block">Interface Language</label>
              <select
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-divider text-xs font-semibold text-content-heading focus:outline-none focus:border-brand-primary cursor-pointer"
                value={preferences.language}
                onChange={(event) => setPreferences((current) => ({ ...current, language: event.target.value }))}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="te">Telugu</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              ['emailNotifications', 'Email notifications', 'Receive updates on goal milestones and task alerts'],
              ['pushNotifications', 'Push notifications', 'Receive real-time browser alerts'],
              ['weeklySummary', 'Weekly learning summary', 'Receive a weekly progress digest email'],
            ].map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-divider">
                <div className="pr-4">
                  <div className="text-xs font-bold text-content-heading">{label}</div>
                  <div className="text-[11px] text-content-muted">{desc}</div>
                </div>
                <Toggle
                  value={Boolean(preferences[key])}
                  onChange={(value) => setPreferences((current) => ({ ...current, [key]: value }))}
                  label={label}
                />
              </div>
            ))}
          </div>
        </section>

        <DeviceSessions />

        {message && (
          <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold" role="status">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/25 cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving Settings…' : 'Save Profile Settings'}
        </button>
      </div>
    </StudentLayout>
  )
}
