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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Student community</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight mt-1">Knowledge feed & collaboration network</h1>
            <p className="text-sm text-content-muted mt-1">Share learning updates, showcase projects, ask questions, and discover collaborators across Dream Wave.</p>
          </div>
          <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-divider" aria-label="Feed sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'text-content-muted hover:text-content-heading hover:bg-surface-elevated'
                }`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </section>

        {message && (
          <p className="p-4 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-stitch text-sm font-medium" role="status">
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CreatePostPanel userName={user?.name} onSubmit={createPost} />

            {tab === 'projects' ? (
              <ProjectShowcase projects={projects} onSelect={setSelectedProject} />
            ) : tab === 'collaboration' ? (
              <CollaborationPanel requests={collaborations} onRefresh={refreshMeta} />
            ) : (
              <>
                {error && <p className="p-4 bg-red-500/10 text-red-500 rounded-stitch text-sm">{error}</p>}
                {loading ? (
                  [...Array(3)].map((_, index) => <div key={index} className="h-36 bg-surface animate-pulse rounded-stitch border border-divider" />)
                ) : posts.length === 0 ? (
                  <div className="bg-surface p-12 rounded-stitch border border-divider text-center space-y-2">
                    <strong className="text-base font-semibold text-content-heading block">No posts in this section yet</strong>
                    <p className="text-sm text-content-muted">{tab === 'following' ? 'Follow students to see their learning updates here.' : 'Be the first to share something useful.'}</p>
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
                  <button
                    type="button"
                    className="w-full py-3 bg-surface hover:bg-surface-elevated text-content-body font-medium rounded-stitch border border-divider transition-colors text-sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>

          <aside className="hidden lg:block space-y-6">
            <CreatorPanel stats={creatorStats} />

            <section className="bg-surface p-5 rounded-stitch border border-divider shadow-sm space-y-4">
              <header className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Trending</span>
                  <h2 className="text-base font-semibold text-content-heading">Topics this week</h2>
                </div>
              </header>
              <div className="flex flex-wrap gap-2">
                {trending.length === 0 ? (
                  <span className="text-xs text-content-muted">Trending topics appear as students share learning content.</span>
                ) : trending.map((item) => (
                  <button
                    key={item.topic}
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-brand-primary/10 text-content-body hover:text-brand-primary border border-divider rounded-full transition-colors"
                    onClick={() => setTab('knowledge')}
                  >
                    {item.topic}
                  </button>
                ))}
              </div>
            </section>

            <LearningGroupsPanel groups={groups} onRefresh={refreshMeta} />
            <StudentDiscoveryPanel students={students} onFollow={handleFollow} />
          </aside>
        </div>

        {activePost && <CommentsPanel post={activePost} onClose={() => setActivePost(null)} />}

        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Project details">
            <div className="fixed inset-0" onClick={() => setSelectedProject(null)} />
            <section className="relative z-10 w-full max-w-lg bg-surface p-6 rounded-stitch border border-divider shadow-xl space-y-4">
              <header className="flex items-center justify-between">
                <div>
                  <strong className="text-lg font-semibold text-content-heading block">{selectedProject.title}</strong>
                  <p className="text-xs text-content-muted">{selectedProject.ownerName}</p>
                </div>
                <button type="button" className="text-xs font-medium text-content-muted hover:text-content-heading" onClick={() => setSelectedProject(null)}>Close</button>
              </header>
              <p className="text-sm text-content-body">{selectedProject.description}</p>
              <div className="flex flex-wrap gap-2">
                {(selectedProject.technologies || []).map((tech) => (
                  <span key={tech} className="px-2.5 py-1 text-xs font-medium bg-surface-elevated text-content-muted rounded-full border border-divider">{tech}</span>
                ))}
              </div>
              <footer className="flex items-center gap-3 pt-2 border-t border-divider">
                {selectedProject.demoUrl && (
                  <a href={selectedProject.demoUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-primary hover:underline">
                    Open demo
                  </a>
                )}
                {selectedProject.githubUrl && (
                  <a href={selectedProject.githubUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-primary hover:underline">
                    Open repository
                  </a>
                )}
              </footer>
            </section>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
