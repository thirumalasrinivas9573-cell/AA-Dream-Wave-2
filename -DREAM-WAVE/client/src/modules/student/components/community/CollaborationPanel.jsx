import { useState } from 'react'
import { communityApi } from '@shared/services/api'

export default function CollaborationPanel({ requests, onRefresh }) {
  const [roleNeeded, setRoleNeeded] = useState('')
  const [skillsNeeded, setSkillsNeeded] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const createRequest = async (event) => {
    event.preventDefault()
    if (!description.trim()) return
    setCreating(true)
    setError('')
    try {
      await communityApi.createCollaboration({
        roleNeeded: roleNeeded.trim(),
        skillsNeeded: skillsNeeded.split(',').map((item) => item.trim()).filter(Boolean),
        description: description.trim(),
        visibility: 'PUBLIC',
      })
      setRoleNeeded('')
      setSkillsNeeded('')
      setDescription('')
      onRefresh?.()
    } catch (err) {
      setError(err.userMessage || 'Unable to create collaboration request.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="community-panel">
      <header><div><span>Collaboration</span><h2>Find collaborators</h2></div></header>

      <form className="community-inline-form" onSubmit={createRequest}>
        <input value={roleNeeded} onChange={(event) => setRoleNeeded(event.target.value)} placeholder="Role needed" aria-label="Role needed" />
        <input value={skillsNeeded} onChange={(event) => setSkillsNeeded(event.target.value)} placeholder="Skills needed" aria-label="Skills needed" />
        <textarea className="textarea" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the collaboration opportunity" aria-label="Collaboration description" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>{creating ? 'Posting…' : 'Post request'}</button>
      </form>
      {error && <p className="community-error">{error}</p>}

      <div className="community-collab-grid">
        {requests.length === 0 ? (
          <div className="community-empty-inline"><strong>No open requests</strong><span>Post a collaboration request to find teammates.</span></div>
        ) : requests.map((request) => (
          <article key={request._id} className="community-collab-card">
            <header>
              <strong>{request.projectTitle || request.roleNeeded || 'Collaboration request'}</strong>
              <span>{request.status}</span>
            </header>
            <p>{request.description}</p>
            {request.matchReason && <small className="community-feed-reason">{request.matchReason}</small>}
            <div className="community-tags">
              {(request.skillsNeeded || []).map((skill) => <span key={skill}>{skill}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
