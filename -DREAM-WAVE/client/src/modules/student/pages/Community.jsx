import { useState } from 'react'
import StudentLayout from '../layouts/StudentLayout'
import { useAuth } from '@shared/context/AuthContext'
import { communityApi } from '@shared/services/api'
import useCommunity from '../hooks/useCommunity'
import CreatePostPanel from '../components/community/CreatePostPanel'
import FeedCard from '../components/community/FeedCard'
import CommentsPanel from '../components/community/CommentsPanel'
import ProjectShowcase from '../components/community/ProjectShowcase'
import LearningGroupsPanel from '../components/community/LearningGroupsPanel'
import CollaborationPanel from '../components/community/CollaborationPanel'
import StudentDiscoveryPanel from '../components/community/StudentDiscoveryPanel'
import CreatorPanel from '../components/community/CreatorPanel'
import '../styles/community.css'

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'knowledge', label: 'Learning' },
  { id: 'projects', label: 'Projects' },
  { id: 'questions', label: 'Questions' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'achievements', label: 'Achievements' },
]

export default function Community() {
  const { user } = useAuth()
  const {
    tab,
    setTab,
    posts,
    loading,
    loadingMore,
    error,
    trending,
    projects,
    groups,
    collaborations,
    students,
    creatorStats,
    loadMore,
    nextCursor,
    createPost,
    toggleLike,
    toggleBookmark,
    deletePost,
    refreshMeta,
  } = useCommunity('for-you')

  const [activePost, setActivePost] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [message, setMessage] = useState('')

  const handleReport = async (post) => {
    const reason = window.prompt('Report reason: Spam, Harassment, Impersonation, Unsafe Content, Misleading Content, Other')
    if (!reason) return
    await communityApi.reportContent({ targetType: 'post', targetId: post._id, reason })
    setMessage('Report submitted. Thank you for helping keep the community safe.')
  }

  const handleCreateTask = async (post) => {
    await communityApi.createTaskFromPost(post._id, {})
    setMessage('Added a practice task from this post.')
  }

  const handleFollow = async (userId) => {
    await communityApi.followStudent(userId)
    refreshMeta()
  }

  return (
    <StudentLayout>
      <div className="community-shell">
        <section className="community-hero">
          <div>
            <span>Student community</span>
            <h1>Knowledge feed & collaboration network</h1>
            <p>Share learning updates, showcase projects, ask questions, and discover collaborators across Dream Wave.</p>
          </div>
          <nav className="community-tabs" aria-label="Feed sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? 'is-active' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </section>

        {message && <p className="community-error" role="status">{message}</p>}

        <div className="community-layout">
          <div className="community-main">
            <CreatePostPanel userName={user?.name} onSubmit={createPost} />

            {tab === 'projects' ? (
              <ProjectShowcase projects={projects} onSelect={setSelectedProject} />
            ) : tab === 'collaboration' ? (
              <CollaborationPanel requests={collaborations} onRefresh={refreshMeta} />
            ) : (
              <>
                {error && <p className="community-error">{error}</p>}
                {loading ? (
                  [...Array(3)].map((_, index) => <div key={index} className="skeleton" style={{ height: 150 }} />)
                ) : posts.length === 0 ? (
                  <div className="community-empty">
                    <strong>No posts in this section yet</strong>
                    <p>{tab === 'following' ? 'Follow students to see their learning updates here.' : 'Be the first to share something useful.'}</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <FeedCard
                      key={post._id}
                      post={post}
                      currentUserId={user?.id || user?._id}
                      onLike={toggleLike}
                      onBookmark={toggleBookmark}
                      onDelete={deletePost}
                      onOpenComments={setActivePost}
                      onReport={handleReport}
                      onCreateTask={handleCreateTask}
                    />
                  ))
                )}
                {nextCursor && (
                  <button type="button" className="btn btn-ghost community-load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>

          <aside className="community-sidebar">
            <CreatorPanel stats={creatorStats} />

            <section className="community-panel">
              <header><div><span>Trending</span><h2>Topics this week</h2></div></header>
              <div className="community-trending">
                {trending.length === 0 ? (
                  <span className="community-empty-inline">Trending topics appear as students share learning content.</span>
                ) : trending.map((item) => (
                  <button key={item.topic} type="button" onClick={() => setTab('knowledge')}>{item.topic}</button>
                ))}
              </div>
            </section>

            <LearningGroupsPanel groups={groups} onRefresh={refreshMeta} />
            <StudentDiscoveryPanel students={students} onFollow={handleFollow} />
          </aside>
        </div>

        {activePost && <CommentsPanel post={activePost} onClose={() => setActivePost(null)} />}

        {selectedProject && (
          <div className="community-modal" role="dialog" aria-modal="true" aria-label="Project details">
            <div className="community-modal-backdrop" onClick={() => setSelectedProject(null)} />
            <section className="community-modal-panel">
              <header>
                <div>
                  <strong>{selectedProject.title}</strong>
                  <p>{selectedProject.ownerName}</p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedProject(null)}>Close</button>
              </header>
              <p>{selectedProject.description}</p>
              <div className="community-tags">
                {(selectedProject.technologies || []).map((tech) => <span key={tech}>{tech}</span>)}
              </div>
              <footer className="community-create-actions">
                {selectedProject.demoUrl && <a href={selectedProject.demoUrl} target="_blank" rel="noreferrer">Open demo</a>}
                {selectedProject.githubUrl && <a href={selectedProject.githubUrl} target="_blank" rel="noreferrer">Open repository</a>}
              </footer>
            </section>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
