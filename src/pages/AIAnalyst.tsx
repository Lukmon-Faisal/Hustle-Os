import { useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { DemoAiNotice, ErrorCard } from '../components/AsyncStates'
import { describeApiError, useApiResource } from '../hooks/useApiResource'
import { askQuestion, fetchActions } from '../services/api'
import type { ChatMessage } from '../types'

const SUGGESTED_EN = [
  'Why my profit reduce?',
  "Wetin dey sell pass?",
  'Which expense dey worry me?',
  'How I fit make more profit?',
  'Which product I suppose stock more?',
  'Why sales drop last week?',
]

/** Which request failed, so the retry button re-runs that one and not the other. */
interface Failure {
  detail: string
  kind: 'ask' | 'actions'
}

export function AIAnalyst() {
  const { t, lang, data, businessId } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [failed, setFailed] = useState<Failure | null>(null)
  const [lastQuestion, setLastQuestion] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // The action-plan shortcut needs the same actions the Action Center shows,
  // so it comes from the backend now rather than being computed locally.
  const actionsLoader = useMemo(
    () => (businessId ? () => fetchActions(businessId) : null),
    [businessId],
  )
  const actionsRes = useApiResource(actionsLoader)

  if (!data) return null

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)

  const runAsk = async (text: string) => {
    if (!businessId) return
    setFailed(null)
    setThinking(true)
    try {
      const answer = await askQuestion(businessId, text)
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'ai', text: answer.en, textPidgin: answer.pcm }])
    } catch (err) {
      console.error(err)
      setFailed({ detail: describeApiError(err), kind: 'ask' })
    } finally {
      setThinking(false)
      scrollToEnd()
    }
  }

  const send = (text: string) => {
    if (!text.trim() || !businessId || thinking) return
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text }])
    setInput('')
    setLastQuestion(text)
    void runAsk(text)
  }

  // Re-runs the failed question without duplicating the user's bubble.
  const retryAsk = () => {
    if (lastQuestion && !thinking) void runAsk(lastQuestion)
  }

  const showNumbers = () => send('Show me the numbers')

  const actionPlan = () => {
    const question: ChatMessage = { id: `u-${Date.now() - 1}`, role: 'user', text: t('actionPlan') }

    // A failed request is not the same as "nothing to recommend" — say which.
    if (actionsRes.error) {
      setMessages((m) => [...m, question])
      setFailed({ detail: actionsRes.error, kind: 'actions' })
      scrollToEnd()
      return
    }

    const plan = actionsRes.data ?? []
    if (plan.length === 0) {
      setMessages((m) => [
        ...m,
        question,
        {
          id: `a-${Date.now()}`,
          role: 'ai',
          text: "I don't have a clear action to recommend right now — your metrics look stable.",
          textPidgin: 'I no get clear action to recommend now — your numbers dey stable.',
        },
      ])
      scrollToEnd()
      return
    }

    const lines = plan
      .map((a, i) => `${i + 1}. ${lang === 'pcm' ? a.nextStepPidgin : a.nextStep}`)
      .join('\n')
    setMessages((m) => [...m, question, { id: `a-${Date.now()}`, role: 'ai', text: lines, textPidgin: lines }])
    scrollToEnd()
  }

  if (!businessId) {
    return (
      <div className="screen stack">
        <div>
          <h1>{t('askYourHustle')}</h1>
          <p style={{ color: 'var(--grey)', marginTop: 4 }}>{t('askSub')}</p>
        </div>
        <DemoAiNotice />
      </div>
    )
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
            <button key={q} className="suggestion-chip" onClick={() => send(q)} disabled={thinking}>
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
          <ErrorCard
            detail={failed.detail}
            onRetry={
              failed.kind === 'actions'
                ? actionsRes.reload
                : lastQuestion
                  ? retryAsk
                  : undefined
            }
          />
        )}
      </div>

      {messages.length > 0 && (
        <div className="row" style={{ gap: 8 }}>
          <button className="suggestion-chip" onClick={showNumbers} disabled={thinking}>{t('showNumbers')}</button>
          <button className="suggestion-chip" onClick={actionPlan} disabled={actionsRes.loading}>{t('actionPlan')}</button>
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
        <button className="btn-primary" style={{ width: 'auto', padding: '13px 18px' }} type="submit" disabled={thinking}>↑</button>
      </form>
    </div>
  )
}
