import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { answerBusinessQuestion, generateActionPlan } from '../services/aiService'
import type { ChatMessage } from '../types'

const SUGGESTED_EN = [
  'Why my profit reduce?',
  "Wetin dey sell pass?",
  'Which expense dey worry me?',
  'How I fit make more profit?',
  'Which product I suppose stock more?',
  'Why sales drop last week?',
]

export function AIAnalyst() {
  const { t, lang, data } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [failed, setFailed] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  if (!data) return null

  const send = (text: string) => {
    if (!text.trim()) return
    setFailed(false)
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setThinking(true)

    // Simulated latency for the "AI thinking" feel; logic itself is deterministic
    // and grounded entirely in the business's actual data (see aiService.ts).
    setTimeout(() => {
      try {
        const answer = answerBusinessQuestion(text, data)
        const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'ai', text: answer.en, textPidgin: answer.pcm }
        setMessages((m) => [...m, aiMsg])
      } catch {
        setFailed(true)
      } finally {
        setThinking(false)
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
      }
    }, 500)
  }

  const showNumbers = () => {
    send(lang === 'pcm' ? 'Show me the numbers' : 'Show me the numbers')
  }

  const actionPlan = () => {
    const plan = generateActionPlan(data)
    if (plan.length === 0) {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: "I don't have a clear action to recommend right now — your metrics look stable.",
        textPidgin: 'I no get clear action to recommend now — your numbers dey stable.',
      }
      setMessages((m) => [...m, aiMsg])
      return
    }
    const lines = plan
      .map((a, i) => `${i + 1}. ${lang === 'pcm' ? a.nextStepPidgin : a.nextStep}`)
      .join('\n')
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'ai',
      text: lines,
      textPidgin: lines,
    }
    setMessages((m) => [...m, { id: `u-${Date.now() - 1}`, role: 'user', text: t('actionPlan') }, aiMsg])
  }

  return (
    <div className="screen stack" style={{ height: 'calc(100vh - 0px)', paddingBottom: 130 }}>
      <div>
        <h1>{t('askYourHustle')}</h1>
        <p style={{ color: 'var(--grey)', marginTop: 4 }}>{t('askSub')}</p>
      </div>

      {messages.length === 0 && (
        <div className="stack" style={{ gap: 8 }}>
          {SUGGESTED_EN.map((q) => (
            <button key={q} className="suggestion-chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div ref={listRef} className="stack" style={{ gap: 10, flex: 1, overflowY: 'auto' }}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.role}`} style={{ display: 'flex' }}>
            {m.role === 'ai' && lang === 'pcm' && m.textPidgin ? m.textPidgin : m.text}
          </div>
        ))}
        {thinking && (
          <div className="chat-bubble ai" style={{ color: 'var(--grey)' }}>
            {lang === 'pcm' ? 'HUSTLE AI dey check your numbers...' : 'HUSTLE AI is checking your numbers...'}
          </div>
        )}
        {failed && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="chat-bubble ai" style={{ color: 'var(--red)' }}>{t('aiTakingBreak')}</div>
            <button className="btn-ghost" onClick={() => send(messages[messages.length - 1]?.text ?? '')}>{t('tryAgain')}</button>
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="row" style={{ gap: 8 }}>
          <button className="suggestion-chip" onClick={showNumbers}>{t('showNumbers')}</button>
          <button className="suggestion-chip" onClick={actionPlan}>{t('actionPlan')}</button>
        </div>
      )}

      <form
        className="row"
        style={{ position: 'fixed', bottom: 74, left: 18, right: 18, maxWidth: 444, margin: '0 auto', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          className="input-field"
          placeholder={lang === 'pcm' ? 'Ask about your hustle...' : 'Ask about your business...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Ask HUSTLE AI"
        />
        <button className="btn-primary" style={{ width: 'auto', padding: '13px 18px' }} type="submit">↑</button>
      </form>
    </div>
  )
}
