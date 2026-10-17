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
  { id: 'general', label: 'General', icon: 'psychology', desc: 'Universal wisdom & career guidance' },
  { id: 'hindu', label: 'Vedic', icon: 'auto_awesome', desc: 'Bhagavad Gita & Vedic philosophy' },
  { id: 'christian', label: 'Christian', icon: 'cross', desc: 'Scripture and Christian values' },
  { id: 'muslim', label: 'Islamic', icon: 'brightness_3', desc: 'Quran and Islamic wisdom' },
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

  const welcomeFor = useCallback(
    (faith) => {
      const name = user?.name?.split(' ')[0] || 'there'
      const welcomes = {
        general: `Hey ${name} 👋 I'm Sage, your context-aware AI mentor. I can see your goals, tasks, roadmaps, and learning progress to give personalized guidance.`,
        hindu: `Namaste ${name}! 🕉️ I am Arjuna. I will guide you with Vedic wisdom and your current learning context.`,
        christian: `Peace be with you, ${name}! ✝️ I am Grace, here to support you with faith-aligned and practical guidance.`,
        muslim: `Assalamu Alaikum, ${name}! ☪️ I am Nur. Let us reflect together using your goals and learning journey.`,
      }
      return { role: 'assistant', content: welcomes[faith] || welcomes.general }
    },
    [user?.name]
  )

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
      <div className="flex flex-col gap-6 w-full">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              CONTEXTUAL ASSISTANT
            </span>
            <h1 className="text-3xl font-heading font-bold text-content-heading tracking-tight mt-1">
              AI Mentor — {mentorName}
            </h1>
            <p className="text-sm text-content-muted">
              Personalized guidance using your goals, tasks, roadmaps, library context, and career interests.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="h-10 px-4 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all flex items-center gap-2 self-start md:self-auto shadow-md shadow-brand-primary/25 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Chat</span>
          </button>
        </header>

        {/* Faith / Wisdom Mode Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FAITH_MODES.map((item) => {
            const isActive = faithMode === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFaithMode(item.id)}
                className={`p-3.5 rounded-stitch text-left transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-xs'
                    : 'bg-surface border-divider text-content-muted hover:border-brand-primary hover:text-content-heading'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="font-heading font-bold text-xs">{item.label}</span>
                </div>
                <span className="text-[10px] text-content-muted line-clamp-1 block">{item.desc}</span>
              </button>
            )
          })}
        </div>

        {/* Mentor Role Modes Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {MENTOR_MODES.map((item) => {
            const isActive = mentorMode === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMentorMode(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'bg-surface border border-divider text-content-muted hover:text-content-heading hover:bg-surface-elevated'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {mentor.error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
            {mentor.error}
          </div>
        )}

        {/* Multi-Pane Chat Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left History Sidebar (1 col on desktop, hidden or stacked) */}
          <aside className="p-4 rounded-stitch bg-surface border border-divider shadow-xs space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs text-content-heading uppercase tracking-wider">
                Conversations
              </h3>
              <button
                type="button"
                onClick={handleNewConversation}
                className="text-xs font-bold text-brand-primary hover:underline"
              >
                + New
              </button>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chat history..."
              className="w-full h-8 px-3 rounded-xl bg-canvas border border-divider text-xs text-content-heading focus:outline-none focus:border-brand-primary"
            />
            <ul className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {filteredConversations.map((item) => (
                <li key={item.id} className="group flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => mentor.openConversation(item.id)}
                    className={`flex-1 text-left p-2 rounded-xl text-xs truncate transition-colors ${
                      mentor.activeId === item.id
                        ? 'bg-brand-primary/10 text-brand-primary font-bold'
                        : 'text-content-body hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="truncate font-semibold">{item.pinned ? '📌 ' : ''}{item.title}</div>
                    <div className="text-[10px] text-content-muted truncate">{item.preview || `${item.messageCount || 0} messages`}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => mentor.removeConversation(item.id)}
                    className="p-1 text-content-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </li>
              ))}
              {!filteredConversations.length && !mentor.bootLoading && (
                <li className="text-[11px] text-content-muted text-center py-2">No past conversations.</li>
              )}
            </ul>
          </aside>

          {/* Central Chat View (2 cols on desktop) */}
          <section className="p-4 md:p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4 lg:col-span-2 flex flex-col min-h-[500px]">
            {/* Chat Room Header */}
            <div className="flex items-center justify-between pb-3 border-b border-divider">
              <div className="flex items-center gap-3">
                <AIOrb state={mentor.loading ? 'thinking' : 'idle'} size={36} color="var(--primary)" />
                <div>
                  <div className="font-heading font-bold text-sm text-content-heading">{mentorName}</div>
                  <div className="text-[10px] text-content-muted">
                    {mentor.loading ? 'Generating response…' : `${MENTOR_MODES.find((m) => m.id === mentorMode)?.label || 'Mentor'} · ${mentor.depth} depth`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={mentor.depth}
                  onChange={(event) => mentor.setDepth(event.target.value)}
                  className="h-8 px-2 rounded-lg bg-canvas border border-divider text-[11px] text-content-heading focus:outline-none"
                >
                  <option value="quick">Quick</option>
                  <option value="simple">Simple</option>
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                  <option value="deep">Deep Dive</option>
                </select>
                {mentor.loading && (
                  <button
                    type="button"
                    onClick={mentor.stopGeneration}
                    className="h-8 px-2.5 rounded-lg bg-rose-500/10 text-rose-500 text-[11px] font-bold"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[420px] pr-2">
              <AnimatePresence initial={false}>
                {displayMessages.map((message, index) => (
                  <motion.div
                    key={`${index}-${message.role}-${message.content?.slice(0, 12)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'bg-canvas border border-divider text-content-heading shadow-xs'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      ) : (
                        <MessageRenderer content={message.content} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {mentor.loading && (
                <p className="text-xs text-content-muted italic animate-pulse">
                  {mentorName} is composing a response…
                </p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2 pt-2 border-t border-divider">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ${mentorName} anything about your goals or tasks...`}
                disabled={mentor.loading}
                className="flex-1 h-11 px-4 rounded-xl bg-canvas border border-divider text-xs text-content-heading placeholder:text-content-muted focus:outline-none focus:border-brand-primary"
              />
              <button
                type="submit"
                disabled={mentor.loading || !input.trim()}
                className="h-11 w-11 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:bg-brand-hover transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </section>

          {/* Right Tools & Action Panel (1 col) */}
          <aside className="space-y-4 lg:col-span-1">
            <div className="p-4 rounded-stitch bg-surface border border-divider shadow-xs space-y-3">
              <h3 className="font-heading font-bold text-xs text-content-heading uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleSend(action.message, action.id)}
                    className="px-3 py-1.5 rounded-xl bg-canvas border border-divider text-[11px] font-semibold text-content-body hover:text-brand-primary hover:border-brand-primary transition-all text-left"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-stitch bg-surface border border-divider shadow-xs space-y-3">
              <h3 className="font-heading font-bold text-xs text-content-heading uppercase tracking-wider">
                Suggested Prompts
              </h3>
              <div className="space-y-1.5">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-2 rounded-xl bg-canvas text-[11px] font-medium text-content-body hover:bg-surface-elevated hover:text-brand-primary transition-all"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </StudentLayout>
  )
}
