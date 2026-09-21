import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { discoveryApi } from '@shared/services/api'
import { safeExternalUrl } from '@shared/utils/safeUrl'

export default function PromotionDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)

  useEffect(() => {
    discoveryApi.promotion(id).then(r => setItem(r.data.item)).catch(() => {})
  }, [id])

  if (!item) return <div style={{ padding: 40, color: '#94A3B8' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F1A', color: '#E2E8F0', padding: 32 }}>
      <Link to="/discover" style={{ color: '#94A3B8' }}>← Discovery</Link>
      <div style={{ maxWidth: 720, margin: '24px auto' }}>
        <div style={{ fontSize: '0.8rem', color: '#38BDF8' }}>{item.category} · {item.ownerName}</div>
        <h1 style={{ margin: '12px 0' }}>{item.title}</h1>
        <p style={{ lineHeight: 1.7, opacity: 0.85 }}>{item.content}</p>
        {item.image && <img src={item.image} alt="" style={{ width: '100%', borderRadius: 12, marginTop: 16 }} />}
        {safeExternalUrl(item.link, { allowRelative: true }) && <a href={safeExternalUrl(item.link, { allowRelative: true })} target="_blank" rel="noreferrer" style={{ color: '#38BDF8', display: 'inline-block', marginTop: 16 }}>Learn more →</a>}
        <p style={{ marginTop: 24, fontSize: '0.82rem', opacity: 0.5 }}>{item.views} views · {item.engagement} engagement</p>
      </div>
    </div>
  )
}
