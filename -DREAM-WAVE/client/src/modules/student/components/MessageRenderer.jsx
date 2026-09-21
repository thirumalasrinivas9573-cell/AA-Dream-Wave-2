// Renders AI long-form responses with proper formatting
// Converts markdown-style text into structured HTML

export default function MessageRenderer({ content, isUser = false }) {
  if (!content) return null

  if (isUser) {
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</span>
  }

  // Parse and render rich content
  const lines = content.split('\n')
  const elements = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines but add spacing
    if (!trimmed) {
      elements.push(<div key={key++} style={{ height: 8 }} />)
      i++; continue
    }

    // H1 headings: # Title
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={key++} style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--purple-light)', marginTop: 16, marginBottom: 8, letterSpacing: '-0.01em' }}>
          {trimmed.slice(2)}
        </h2>
      )
      i++; continue
    }

    // H2/H3 headings: ## or ### Title
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const level = trimmed.startsWith('### ') ? 3 : 2
      const text = trimmed.replace(/^#{2,3} /, '')
      elements.push(
        <h3 key={key++} style={{ fontSize: level === 2 ? '0.9375rem' : '0.875rem', fontWeight: 700, color: level === 2 ? 'var(--purple-light)' : '#94A3B8', marginTop: 14, marginBottom: 6, borderLeft: level === 2 ? '3px solid var(--purple)' : 'none', paddingLeft: level === 2 ? 10 : 0 }}>
          {text}
        </h3>
      )
      i++; continue
    }

    // Bullet points: - or * or •
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const bulletItems = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* ') || lines[i].trim().startsWith('• '))) {
        bulletItems.push(lines[i].trim().replace(/^[-*•] /, ''))
        i++
      }
      elements.push(
        <ul key={key++} style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 8 }}>
          {bulletItems.map((item, j) => (
            <li key={j} style={{ display: 'flex', gap: 8, marginBottom: 5, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-primary)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--purple)', marginTop: 4, flexShrink: 0, fontSize: '0.6rem' }}>●</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list: 1. 2. 3. etc
    if (/^\d+\. /.test(trimmed)) {
      const numberedItems = []
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        const num = lines[i].trim().match(/^(\d+)\. (.*)/)
        if (num) numberedItems.push({ n: num[1], text: num[2] })
        i++
      }
      elements.push(
        <ol key={key++} style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 8 }}>
          {numberedItems.map((item, j) => (
            <li key={j} style={{ display: 'flex', gap: 10, marginBottom: 7, fontSize: '0.875rem', lineHeight: 1.65, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(139,92,246,0.2)', color: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{item.n}</span>
              <span style={{ color: 'var(--text-primary)', flex: 1 }}>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Bold section headers using **text**:
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2, -2).includes('**')) {
      elements.push(
        <div key={key++} style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--purple-light)', marginTop: 12, marginBottom: 5 }}>
          {trimmed.slice(2, -2)}
        </div>
      )
      i++; continue
    }

    // Code blocks ```
    if (trimmed.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={key++} style={{ background: '#0D0D17', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: '12px 16px', overflowX: 'auto', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 10, color: '#E2E8F0' }}>
          {codeLines.join('\n')}
        </pre>
      )
      continue
    }

    // Horizontal rule ---
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />)
      i++; continue
    }

    // Regular paragraph
    elements.push(
      <p key={key++} style={{ fontSize: '0.875rem', lineHeight: 1.78, color: 'var(--text-primary)', marginBottom: 6 }}>
        {renderInline(trimmed)}
      </p>
    )
    i++
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{elements}</div>
}

// Render inline formatting: **bold**, *italic*, `code`
function renderInline(text) {
  if (!text) return ''
  // Split on bold, italic, and code patterns
  const parts = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0, match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={last}>{text.slice(last, match.index)}</span>)
    const raw = match[0]
    if (raw.startsWith('**')) parts.push(<strong key={match.index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{raw.slice(2, -2)}</strong>)
    else if (raw.startsWith('*')) parts.push(<em key={match.index} style={{ color: 'var(--purple-light)', fontStyle: 'italic' }}>{raw.slice(1, -1)}</em>)
    else if (raw.startsWith('`')) parts.push(<code key={match.index} style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--purple-light)', padding: '1px 6px', borderRadius: 4, fontSize: '0.82em', fontFamily: 'monospace' }}>{raw.slice(1, -1)}</code>)
    last = match.index + raw.length
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)
  return parts.length ? parts : text
}
