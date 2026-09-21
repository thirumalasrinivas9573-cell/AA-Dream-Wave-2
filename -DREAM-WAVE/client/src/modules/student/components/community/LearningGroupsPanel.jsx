import { useState } from 'react'
import { communityApi } from '@shared/services/api'

export default function LearningGroupsPanel({ groups, onRefresh }) {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const createGroup = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await communityApi.createGroup({ name: name.trim(), topic: topic.trim(), description: description.trim(), visibility: 'PUBLIC' })
      setName('')
      setTopic('')
      setDescription('')
      onRefresh?.()
    } catch (err) {
      setError(err.userMessage || 'Unable to create group.')
    } finally {
      setCreating(false)
    }
  }

  const joinGroup = async (groupId) => {
    await communityApi.joinGroup(groupId)
    onRefresh?.()
  }

  return (
    <section className="community-panel">
      <header><div><span>Groups</span><h2>Learning groups</h2></div></header>

      <form className="community-inline-form" onSubmit={createGroup}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Group name" aria-label="Group name" />
        <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic" aria-label="Group topic" />
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" aria-label="Group description" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>{creating ? 'Creating…' : 'Create group'}</button>
      </form>
      {error && <p className="community-error">{error}</p>}

      <div className="community-group-grid">
        {groups.length === 0 ? (
          <div className="community-empty-inline"><strong>No groups yet</strong><span>Create the first learning group.</span></div>
        ) : groups.map((group) => (
          <article key={group._id} className="community-group-card">
            <strong>{group.name}</strong>
            <p>{group.description || 'Learning community'}</p>
            <div className="community-tags">{group.topic && <span>{group.topic}</span>}</div>
            <footer>
              <span>{group.memberCount || 0} members</span>
              {!group.isMember && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => joinGroup(group._id)}>Join</button>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}
