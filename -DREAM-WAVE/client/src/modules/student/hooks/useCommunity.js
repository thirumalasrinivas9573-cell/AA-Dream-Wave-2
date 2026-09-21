import { useCallback, useEffect, useState } from 'react'
import { communityApi } from '@shared/services/api'

export default function useCommunity(initialTab = 'for-you') {
  const [tab, setTab] = useState(initialTab)
  const [posts, setPosts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [trending, setTrending] = useState([])
  const [projects, setProjects] = useState([])
  const [groups, setGroups] = useState([])
  const [collaborations, setCollaborations] = useState([])
  const [students, setStudents] = useState([])
  const [creatorStats, setCreatorStats] = useState(null)

  const loadFeed = useCallback(async ({ append = false, cursor } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const { data } = await communityApi.getFeed({ tab, cursor, limit: 20 })
      setPosts((current) => (append ? [...current, ...(data.posts || [])] : data.posts || []))
      setNextCursor(data.nextCursor || null)
    } catch (err) {
      setError(err.userMessage || 'Unable to load community feed.')
      if (!append) setPosts([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tab])

  const refreshMeta = useCallback(async () => {
    const results = await Promise.allSettled([
      communityApi.getTrending(),
      communityApi.getProjects({ limit: 12 }),
      communityApi.listGroups(),
      communityApi.listCollaborations(),
      communityApi.discoverStudents({ limit: 8 }),
      communityApi.getCreatorStats(),
    ])
    if (results[0].status === 'fulfilled') setTrending(results[0].value.data.topics || [])
    if (results[1].status === 'fulfilled') setProjects(results[1].value.data.projects || [])
    if (results[2].status === 'fulfilled') setGroups(results[2].value.data.groups || [])
    if (results[3].status === 'fulfilled') setCollaborations(results[3].value.data.requests || [])
    if (results[4].status === 'fulfilled') setStudents(results[4].value.data.students || [])
    if (results[5].status === 'fulfilled') setCreatorStats(results[5].value.data.stats || null)
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  useEffect(() => {
    refreshMeta()
  }, [refreshMeta])

  const createPost = async (payload) => {
    const { data } = await communityApi.createPost(payload)
    setPosts((current) => [data.post, ...current])
    return data.post
  }

  const toggleLike = async (postId) => {
    setPosts((current) => current.map((post) => {
      if (post._id !== postId) return post
      const likedByMe = !post.likedByMe
      return {
        ...post,
        likedByMe,
        likeCount: Math.max(0, (post.likeCount || 0) + (likedByMe ? 1 : -1)),
      }
    }))
    try {
      const { data } = await communityApi.likePost(postId)
      setPosts((current) => current.map((post) => (
        post._id === postId ? { ...post, likeCount: data.likeCount, likedByMe: data.likedByMe } : post
      )))
    } catch {
      loadFeed()
    }
  }

  const toggleBookmark = async (postId) => {
    setPosts((current) => current.map((post) => (
      post._id === postId ? { ...post, savedByMe: !post.savedByMe } : post
    )))
    try {
      const { data } = await communityApi.bookmarkPost(postId)
      setPosts((current) => current.map((post) => (
        post._id === postId ? { ...post, savedByMe: data.saved } : post
      )))
    } catch {
      loadFeed()
    }
  }

  const deletePost = async (postId) => {
    await communityApi.deletePost(postId)
    setPosts((current) => current.filter((post) => post._id !== postId))
  }

  const loadMore = () => {
    if (!nextCursor || loadingMore) return
    loadFeed({ append: true, cursor: nextCursor })
  }

  return {
    tab,
    setTab,
    posts,
    nextCursor,
    loading,
    loadingMore,
    error,
    trending,
    projects,
    groups,
    collaborations,
    students,
    creatorStats,
    loadFeed,
    loadMore,
    createPost,
    toggleLike,
    toggleBookmark,
    deletePost,
    refreshMeta,
  }
}
