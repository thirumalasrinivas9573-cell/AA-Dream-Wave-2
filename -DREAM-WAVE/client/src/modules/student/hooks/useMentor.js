import { useCallback, useEffect, useRef, useState } from 'react'
import { mentorApi } from '@shared/services/api'
import mentorService from '@shared/services/mentorService'

export default function useMentor({ faithMode = 'general', mentorMode = 'general' } = {}) {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [depth, setDepth] = useState('standard')
  const abortRef = useRef(null)
  const inFlightRef = useRef(false)

  const loadConversations = useCallback(async (force = false) => {
    try {
      const response = await mentorService.conversations({ force })
      setConversations(response.conversations || [])
      return response.conversations || []
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load conversations.')
      return []
    }
  }, [])

  const openConversation = useCallback(async (conversationId) => {
    setBootLoading(true)
    setError('')
    try {
      const response = await mentorService.getConversation(conversationId)
      setActiveId(conversationId)
      setMessages(response.messages || [])
      setDepth(response.conversation?.explanationDepth || 'standard')
      return response
    } catch (requestError) {
      setError(requestError.userMessage || 'Conversation not found.')
      return null
    } finally {
      setBootLoading(false)
    }
  }, [])

  const startConversation = useCallback(async (options = {}) => {
    setError('')
    try {
      const response = await mentorService.createConversation({
        faithMode: options.faithMode || faithMode,
        mentorMode: options.mentorMode || mentorMode,
        explanationDepth: options.explanationDepth || depth,
        title: options.title || 'New conversation',
      })
      const created = response.conversation
      setConversations((prev) => [created, ...prev])
      setActiveId(created.id)
      setMessages([])
      return created
    } catch (requestError) {
      setError(requestError.userMessage || 'Could not start a conversation.')
      return null
    }
  }, [depth, faithMode, mentorMode])

  const sendMessage = useCallback(async ({
    message,
    action = '',
    faith = faithMode,
    mode = mentorMode,
    explanationDepth = depth,
  }) => {
    const text = String(message || '').trim()
    if (!text || inFlightRef.current) return null
    inFlightRef.current = true
    setLoading(true)
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    try {
      let conversationId = activeId
      if (!conversationId) {
        const created = await startConversation({ faithMode: faith, mentorMode: mode, explanationDepth })
        conversationId = created?.id
      }
      if (!conversationId) throw new Error('Conversation unavailable')

      const response = await mentorService.chat({
        message: text,
        faithMode: faith,
        mentorMode: mode,
        conversationId,
        action,
        explanationDepth,
      }, { signal: abortRef.current.signal })

      setActiveId(response.conversationId || conversationId)
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply || response.message }])
      setSuggestions(response.suggestions || [])
      await loadConversations(true)
      return response
    } catch (requestError) {
      if (requestError.code === 'ERR_CANCELED') {
        setError('Generation stopped.')
      } else if (requestError.response?.status === 401) {
        setMessages((prev) => prev.slice(0, -1))
        setError(requestError.userMessage || 'Please sign in again to use AI Mentor.')
      } else if (requestError.response?.status === 429) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: requestError.userMessage || 'AI rate limit. Please wait a moment.',
        }])
        setError(requestError.userMessage || 'AI rate limit. Please wait a moment.')
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: requestError.userMessage || 'Mentor is temporarily unavailable. Please try again.',
        }])
        setError(requestError.userMessage || 'Mentor request failed.')
      }
      return null
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }, [activeId, depth, faithMode, loadConversations, mentorMode, startConversation])

  const renameConversation = useCallback(async (id, title) => {
    await mentorService.updateConversation(id, { title })
    await loadConversations(true)
  }, [loadConversations])

  const pinConversation = useCallback(async (id, pinned) => {
    await mentorService.updateConversation(id, { pinned })
    await loadConversations(true)
  }, [loadConversations])

  const saveConversationToMemory = useCallback(async (id) => {
    await mentorService.updateConversation(id, { saveToMemory: true })
  }, [])

  const removeConversation = useCallback(async (id) => {
    await mentorService.deleteConversation(id)
    if (activeId === id) {
      setActiveId(null)
      setMessages([])
    }
    await loadConversations(true)
  }, [activeId, loadConversations])

  const clearActiveConversation = useCallback(async () => {
    if (!activeId) return
    await mentorApi.clear({ conversationId: activeId })
    setMessages([])
  }, [activeId])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    inFlightRef.current = false
    setLoading(false)
  }, [])

  useEffect(() => {
    loadConversations().finally(() => setBootLoading(false))
  }, [loadConversations])

  return {
    conversations,
    activeId,
    messages,
    loading,
    bootLoading,
    error,
    suggestions,
    depth,
    setDepth,
    setActiveId,
    setMessages,
    loadConversations,
    openConversation,
    startConversation,
    sendMessage,
    renameConversation,
    pinConversation,
    saveConversationToMemory,
    removeConversation,
    clearActiveConversation,
    stopGeneration,
  }
}
