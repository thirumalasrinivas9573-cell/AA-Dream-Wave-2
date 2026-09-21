import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { interactionApi } from '../../services/api'

export default function PublicProfileActions({ targetType, targetId, accent = '#38BDF8' }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (user?.role === 'student') {
      interactionApi.status({ targetType, targetId })
        .then(r => {
          setFollowing(r.data.following)
          setBookmarked(r.data.bookmarked)
        })
        .catch(() => {})
    }
  }, [user, targetType, targetId])

  const needLogin = () => {
    setMsg('Sign in as a student to use this feature')
    setTimeout(() => { window.location.href = '/student/login' }, 1200)
  }

  const toggleFollow = async () => {
    if (!user) return needLogin()
    const { data } = await interactionApi.follow({ targetType, targetId })
    setFollowing(data.following)
  }

  const toggleBookmark = async () => {
    if (!user) return needLogin()
    const { data } = await interactionApi.bookmark({ targetType, targetId })
    setBookmarked(data.bookmarked)
  }

  const submitReview = async (e) => {
    e.preventDefault()
    if (!user) return needLogin()
    const photos = photoUrl.trim() ? [photoUrl.trim()] : []
    await interactionApi.createReview({ targetType, targetId, rating, content: review, photos })
    setMsg('Review submitted for moderation')
    setReview('')
    setPhotoUrl('')
  }

  const share = () => {
    navigator.clipboard?.writeText(window.location.href)
    setMsg('Link copied to clipboard')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '16px 0', alignItems: 'center' }}>
      <button type="button" onClick={toggleFollow} style={pill(accent, following)}>{following ? '✓ Following' : '+ Follow'}</button>
      <button type="button" onClick={toggleBookmark} style={pill(accent, bookmarked)}>{bookmarked ? '★ Saved' : '☆ Save'}</button>
      <button type="button" onClick={share} style={pill(accent)}>Share</button>
      {msg && <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>{msg}</span>}
      {user?.role === 'student' && (
        <form onSubmit={submitReview} style={{ width: '100%', marginTop: 12, display: 'grid', gap: 8 }}>
          <label style={{ fontSize: '0.82rem' }}>Leave a review
            <select value={rating} onChange={e => setRating(Number(e.target.value))} style={{ marginLeft: 8, padding: 4, borderRadius: 6 }}>
              {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </label>
          <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Your experience..." rows={2}
            style={{ padding: 10, borderRadius: 8, border: `1px solid ${accent}44`, background: 'rgba(0,0,0,0.3)', color: 'inherit' }} />
          <input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="Optional campus photo URL"
            style={{ padding: 10, borderRadius: 8, border: `1px solid ${accent}44`, background: 'rgba(0,0,0,0.3)', color: 'inherit' }} />
          <button type="submit" style={{ ...pill(accent), width: 'fit-content' }}>Submit Review</button>
        </form>
      )}
      {!user && <span style={{ fontSize: '0.8rem', opacity: 0.6 }}><Link to="/student/login" style={{ color: accent }}>Student login</Link> to follow, save, or review</span>}
    </div>
  )
}

function pill(accent, active) {
  return {
    padding: '8px 16px', borderRadius: 20, border: `1px solid ${accent}`,
    background: active ? `${accent}33` : 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '0.85rem',
  }
}
