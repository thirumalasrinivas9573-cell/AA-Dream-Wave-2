import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import StudentLayout from '../layouts/StudentLayout'
import { useAuth } from '@shared/context/AuthContext'
import MessageRenderer from '../components/MessageRenderer'
import AIOrb from '@shared/components/animations/AIOrb'
import useMentor from '../hooks/useMentor'
import '../styles/mentor.css'

const FAITH_MODES = [
  { id: 'general', label: 'General', icon: '🧠', color: '#8B5CF6', desc: 'Universal wisdom & career guidance' },
  { id: 'hindu', label: 'Vedic', icon: '🕉️', color: '#F59E0B', desc: 'Bhagavad Gita & Vedic philosophy' },
  { id: 'christian', label: 'Christian', icon: '✝️', color: '#60A5FA', desc: 'Scripture and Christian values' },
  { id: 'muslim', label: 'Islamic', icon: '☪️', color: '#34D399', desc: 'Quran and Islamic wisdom' },
]

const MENTOR_MODES = [
  { id: 'general', label: 'General Mentor' },
  { id: 'study', label: 'Study Mentor' },
  { id: 'goal', label: 'Goal Coach' },
  { id: 'career', label: 'Career Guide' },
  { id: 'learning', label: 'Learning Assistant' },
  { id: 'project', label: 'Project Guide' },
  { id: 'research', label: 'Research Assistant' },
]

const QUICK_ACTIONS = [
  { id: 'plan-day', label: 'Plan My Day', message: 'Plan my day based on my goals, tasks, and deadlines.' },
  { id: 'review-progress', label: 'Review My Progress', message: 'Review my learning progress and tell me what is going well and what to improve.' },
  { id: 'recommend-next', label: 'Recommend Next Step', message: 'What should I do next based on my current goals and tasks?' },
  { id: 'recommend-books', label: 'Recommend Books', message: 'Recommend books from my library context that fit my goals.' },
  { id: 'help-career', label: 'Help With Career', message: 'Help me with my career direction using my skills and interests.' },
  { id: 'break-task', label: 'Break Down a Task', message: 'Help me break my highest priority task into smaller actionable steps.' },
  { id: 'improve-roadmap', label: 'Improve My Roadmap', message: 'Review my roadmap and suggest the next meaningful stage.' },
  { id: 'research-topic', label: 'Research a Topic', message: 'Help me research a topic and suggest a learning sequence.' },
]

const PROMPTS = [
  'What should I focus on right now?',
  'Help me stay consistent every day',
  'Explain a concept simply',
  'What am I missing for my top goal?',
]

const MENTOR_NAMES = { general: 'Sage', hindu: 'Arjuna', christian: 'Grace', muslim: 'Nur' }

export default function Mentor() {
  const { user } = useAuth()
  const [faithMode, setFaithMode] = useState('general')
  const [mentorMode, setMentorMode] = useState('general')
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const mentor = useMentor({ faithMode, mentorMode })
  const currentFaith = FAITH_MODES.find((item) => item.id === faithMode) || FAITH_MODES[0]
  const mentorName = MENTOR_NAMES[faithMode]

  const welcomeFor = useCallback((faith) => {
    const name = user?.name?.split(' ')[0] || 'there'
    const welcomes = {
      general: `Hey ${name} 👋 I'm Sage, your context-aware AI mentor. I can see your goals, tasks, roadmaps, and learning progress to give personalized guidance.`,
      hindu: `Namaste ${name}! 🕉️ I am Arjuna. I will guide you with Vedic wisdom and your current learning context.`,
      christian: `Peace be with you, ${name}! ✝️ I am Grace, here to support you with faith-aligned and practical guidance.`,
      muslim: `Assalamu Alaikum, ${name}! ☪️ I am Nur. Let us reflect together using your goals and learning journey.`,
    }
    return { role: 'assistant', content: welcomes[faith] || welcomes.general }
  }, [user?.name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mentor.messages, mentor.loading])

  useEffect(() => {
    if (!mentor.activeId && !mentor.bootLoading && mentor.messages.length === 0) {
      mentor.setMessages([welcomeFor(faithMode)])
    }
  }, [faithMode, mentor.activeId, mentor.bootLoading, mentor.messages.length, mentor.setMessages, welcomeFor, mentor])

  const filteredConversations = mentor.conversations.filter((item) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return item.title?.toLowerCase().includes(q) || item.preview?.toLowerCase().includes(q)
  })

  const handleSend = async (text, action = '') => {
    const message = String(text || input).trim()
    if (!message || mentor.loading) return
    setInput('')
    await mentor.sendMessage({
      message,
      action,
      faith: faithMode,
      mode: mentorMode,
      explanationDepth: mentor.depth,
    })
    inputRef.current?.focus()
  }

  const handleNewConversation = async () => {
    mentor.setActiveId(null)
    mentor.setMessages([welcomeFor(faithMode)])
    await mentor.startConversation({ faithMode, mentorMode, explanationDepth: mentor.depth })
  }

  const displayMessages = mentor.messages.length ? mentor.messages : [welcomeFor(faithMode)]

  return (
    <StudentLayout>
      <div className="dw-mentor">
        <header className="page-header">
          <h1>🤖 AI Mentor — <span className="gradient-text">{mentorName}</span></h1>
          <p>Context-aware guidance using your goals, tasks, roadmaps, library progress, and career interests.</p>
        </header>

        <section aria-label="Wisdom tradition">
          <div className="dw-mentor__modes">
            {FAITH_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dw-mentor__mode-btn ${faithMode === item.id ? 'is-active' : ''}`}
                style={{
                  borderColor: faithMode === item.id ? item.color : undefined,
                  background: faithMode === item.id ? `${item.color}15` : undefined,
                }}
                onClick={() => setFaithMode(item.id)}
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }} aria-hidden="true">{item.icon}</div>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Mentor mode">
          <div className="dw-mentor__mentor-modes">
            {MENTOR_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dw-mentor__mentor-mode-btn ${mentorMode === item.id ? 'is-active' : ''}`}
                style={{ borderColor: mentorMode === item.id ? currentFaith.color : undefined }}
                onClick={() => setMentorMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {mentor.error && <p className="dw-mentor__error" role="alert">{mentor.error}</p>}

        <div className="dw-mentor__layout">
          <aside className="dw-mentor__history" aria-label="Conversation history">
            <div className="dw-mentor__history-header">
              <h2>Conversations</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleNewConversation}>New</button>
            </div>
            <div style={{ padding: '8px 10px' }}>
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
              />
            </div>
            <ul className="dw-mentor__history-list">
              {filteredConversations.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`dw-mentor__history-item ${mentor.activeId === item.id ? 'is-active' : ''}`}
                    onClick={() => mentor.openConversation(item.id)}
                  >
                    <strong>{item.pinned ? '📌 ' : ''}{item.title}</strong>
                    <small>{item.preview || `${item.messageCount || 0} messages`}</small>
                  </button>
                  <div className="dw-mentor__history-actions">
                    <button type="button" onClick={() => mentor.pinConversation(item.id, !item.pinned)} aria-label={item.pinned ? 'Unpin conversation' : 'Pin conversation'}>
                      {item.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button type="button" onClick={() => {
                      const title = window.prompt('Rename conversation', item.title)
                      if (title) mentor.renameConversation(item.id, title)
                    }}>Rename</button>
                    <button type="button" onClick={() => mentor.removeConversation(item.id)}>Delete</button>
                  </div>
                </li>
              ))}
              {!filteredConversations.length && !mentor.bootLoading && (
                <li><small>No conversations yet. Start a new one.</small></li>
              )}
            </ul>
          </aside>

          <section className="dw-mentor__chat" aria-label="Mentor conversation">
            <div className="dw-mentor__chat-header" style={{ background: `${currentFaith.color}0d` }}>
              <AIOrb state={mentor.loading ? 'thinking' : 'idle'} size={44} color={currentFaith.color} />
              <div className="dw-mentor__chat-header-meta">
                <strong>{mentorName}</strong>
                <small>{mentor.loading ? 'Generating response…' : `${MENTOR_MODES.find((m) => m.id === mentorMode)?.label || 'Mentor'} · ${mentor.depth} depth`}</small>
              </div>
              <div className="dw-mentor__chat-toolbar">
                <select value={mentor.depth} onChange={(event) => mentor.setDepth(event.target.value)} aria-label="Explanation depth">
                  <option value="quick">Quick</option>
                  <option value="simple">Simple</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                  <option value="deep">Deep dive</option>
                </select>
                <button type="button" onClick={() => mentor.saveConversationToMemory(mentor.activeId)} disabled={!mentor.activeId}>Save</button>
                <button type="button" onClick={mentor.clearActiveConversation} disabled={!mentor.activeId}>Clear</button>
                {mentor.loading && <button type="button" onClick={mentor.stopGeneration}>Stop</button>}
              </div>
            </div>

            <div className="dw-mentor__messages" aria-live="polite">
              <AnimatePresence initial={false}>
                {displayMessages.map((message, index) => (
                  <motion.div
                    key={`${index}-${message.role}-${message.content?.slice(0, 12)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`dw-mentor__message-row ${message.role === 'user' ? 'is-user' : ''}`}
                  >
                    {message.role === 'assistant' && <AIOrb state="idle" size={28} color={currentFaith.color} />}
                    <div className={`dw-mentor__bubble ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                      {message.role === 'user'
                        ? <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
                        : <MessageRenderer content={message.content} />}
                    </div>
                    {message.role === 'user' && (
                      <span className="dw-mentor__avatar is-user" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {mentor.loading && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{mentorName} is composing a thoughtful response…</p>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="dw-mentor__composer">
              <form onSubmit={(event) => { event.preventDefault(); handleSend() }}>
                <label className="sr-only" htmlFor="mentor-input">Message {mentorName}</label>
                <input
                  id="mentor-input"
                  ref={inputRef}
                  className="input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={`Talk to ${mentorName}…`}
                  disabled={mentor.loading}
                />
                <button type="submit" className="btn btn-primary" disabled={mentor.loading || !input.trim()} aria-label="Send message">
                  {mentor.loading ? '…' : '↑'}
                </button>
              </form>
            </div>
          </section>

          <aside className="dw-mentor__aside" aria-label="Mentor tools">
            <div className="dw-mentor-panel">
              <div className="dw-mentor-panel__header"><h2>Quick Actions</h2></div>
              <div className="dw-mentor-panel__body dw-mentor__quick-actions">
                {QUICK_ACTIONS.map((action) => (
                  <button key={action.id} type="button" onClick={() => handleSend(action.message, action.id)}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dw-mentor-panel">
              <div className="dw-mentor-panel__header"><h2>Prompts</h2></div>
              <div className="dw-mentor-panel__body dw-mentor__prompts">
                {PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => handleSend(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>

            {mentor.suggestions.length > 0 && (
              <div className="dw-mentor-panel">
                <div className="dw-mentor-panel__header"><h2>Suggested Links</h2></div>
                <div className="dw-mentor-panel__body dw-mentor__suggestions">
                  {mentor.suggestions.map((item) => (
                    <Link key={`${item.url}-${item.label}`} to={item.url}>{item.label} →</Link>
                  ))}
                </div>
              </div>
            )}

            <div className="dw-mentor-panel">
              <div className="dw-mentor-panel__header"><h2>Memory</h2></div>
              <div className="dw-mentor-panel__body">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Save important conversations to your private AI memory from the chat toolbar. View saved items in <Link to="/student/intelligence">AI Home</Link>.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StudentLayout>
  )
}
