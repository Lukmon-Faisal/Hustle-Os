import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { describeApiError } from '../hooks/useApiResource'
import { parseTransaction, type ParsedTransaction } from '../services/api'

/**
 * Minimal shape of the Web Speech API surface this component uses. Declared
 * locally and reached through a cast rather than as an ambient `Window`
 * augmentation: `SpeechRecognition` is still vendor-prefixed in Chromium and
 * missing entirely in some browsers, and merging into the global `Window`
 * interface risks colliding with whatever the DOM lib ships.
 */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const EXAMPLES = {
  en: 'e.g. "sold 3 plates of jollof for 4500"',
  pcm: 'e.g. "I sell 3 plate jollof for 4500"',
}

interface Props {
  /** Receives the extraction so the caller can pre-fill its own form state. */
  onParsed: (parsed: ParsedTransaction) => void
}

export function TypeOrTalk({ onParsed }: Props) {
  const { lang, businessId } = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filled, setFilled] = useState<ParsedTransaction | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  // Resolved once: if the constructor is absent the mic button never renders,
  // so an unsupported browser sees a plain type-and-parse field instead of a
  // button that does nothing.
  const SpeechCtor = useMemo(getSpeechRecognitionCtor, [])

  // Stop an in-flight recognition session if the user navigates away mid-sentence.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* already stopped */
      }
    }
  }, [])

  const runParse = async (phrase: string) => {
    const trimmed = phrase.trim()
    if (!trimmed || !businessId || busy) return
    setBusy(true)
    setError(null)
    setFilled(null)
    try {
      const parsed = await parseTransaction(businessId, trimmed)
      onParsed(parsed)
      setFilled(parsed)
      setText('')
    } catch (err) {
      console.error(err)
      setError(describeApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const startListening = () => {
    if (!SpeechCtor || listening || busy) return
    setError(null)
    setFilled(null)
    try {
      const recognition = new SpeechCtor()
      recognitionRef.current = recognition
      // en-NG is the closest widely-supported tag for Nigerian English/Pidgin.
      recognition.lang = 'en-NG'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? ''
        if (!transcript) return
        setText(transcript)
        // Parse the transcript directly — setText hasn't committed yet.
        void runParse(transcript)
      }
      recognition.onerror = (event) => {
        setListening(false)
        setError(
          event.error === 'not-allowed'
            ? lang === 'pcm'
              ? 'Microphone no get permission. Allow am for your browser settings.'
              : 'Microphone permission was denied. Allow it in your browser settings.'
            : lang === 'pcm'
              ? 'I no hear anything. Try talk again or type am.'
              : "Didn't catch that. Try speaking again, or type it instead.",
        )
      }
      recognition.onend = () => setListening(false)

      recognition.start()
      setListening(true)
    } catch (err) {
      // Constructor present but unusable (insecure origin, no mic device, ...).
      console.error(err)
      setListening(false)
      setError(
        lang === 'pcm'
          ? 'Voice input no work for this browser. Type am instead.'
          : "Voice input isn't available in this browser. Type it instead.",
      )
    }
  }

  if (!businessId) return null

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="stack" style={{ gap: 2 }}>
        <span className="eyebrow">
          {lang === 'pcm' ? 'Type or Talk (AI Pre-fill)' : 'Type or Talk (AI Pre-fill)'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--grey)' }}>
          {lang === 'pcm' ? EXAMPLES.pcm : EXAMPLES.en}
        </span>
      </div>

      <form
        className="row"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault()
          void runParse(text)
        }}
      >
        <input
          className="input-field"
          placeholder={lang === 'pcm' ? 'Talk am or type am...' : 'Describe the transaction...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy || listening}
          aria-label={lang === 'pcm' ? 'Describe your transaction' : 'Describe your transaction'}
        />
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '13px 16px' }}
          type="submit"
          disabled={busy || listening || !text.trim()}
        >
          {lang === 'pcm' ? 'Parse' : 'Parse'}
        </button>
      </form>

      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        {SpeechCtor && (
          <button
            className={`suggestion-chip ${listening ? 'mic-live' : ''}`}
            onClick={startListening}
            disabled={busy || listening}
            type="button"
          >
            {listening
              ? lang === 'pcm'
                ? '🎤 I dey listen...'
                : '🎤 Listening...'
              : lang === 'pcm'
                ? '🎤 Speak'
                : '🎤 Speak'}
          </button>
        )}
        {busy && (
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="spinner" aria-hidden />
            <span style={{ fontSize: 12.5, color: 'var(--grey)' }}>
              {lang === 'pcm' ? 'AI dey read am...' : 'Reading it...'}
            </span>
          </span>
        )}
      </div>

      {error && <p style={{ fontSize: 12.5, color: 'var(--red)', margin: 0 }}>{error}</p>}

      {filled && (
        <p style={{ fontSize: 12.5, color: 'var(--green)', margin: 0 }}>
          {lang === 'pcm'
            ? `I don fill the ${filled.type === 'sale' ? 'sale' : 'expense'} form below — check am well, then press save.`
            : `Filled the ${filled.type} form below — check the values, then save.`}
        </p>
      )}
    </div>
  )
}
