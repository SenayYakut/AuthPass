'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'

type AnyWindow = Window & typeof globalThis & { SpeechRecognition?: any; webkitSpeechRecognition?: any }

interface Props {
  mode: 'clinician' | 'staff'
  onSubmit: (text: string) => void
  loading: boolean
}

const PLACEHOLDERS = {
  clinician: 'e.g. "Humira, John Doe, Aetna" or say it aloud',
  staff:     'e.g. "John Doe, Humira, Aetna" or say it aloud',
}

const DEMO_EXAMPLES = {
  clinician: [
    'Humira, John Doe, Aetna',
    'Ozempic, Maria Rodriguez, UHC',
    'Dupixent, Robert Kim, BCBS',
    'Keytruda, Susan Chen, Aetna',
    'Enbrel, David Park, UHC',
  ],
  staff: [
    'John Doe, Humira, Aetna',
    'Maria Rodriguez, Ozempic, UHC',
    'Robert Kim, Dupixent, BCBS',
    'Susan Chen, Keytruda, Aetna',
    'David Park, Enbrel, UHC',
  ],
}

export default function VoiceInput({ mode, onSubmit, loading }: Props) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as AnyWindow
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  const startListening = useCallback(() => {
    const w = window as AnyWindow
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRec) return

    const rec = new SpeechRec()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
      setText(transcript)
    }

    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) onSubmit(text.trim())
  }

  return (
    <div className="space-y-4">
      {/* Input row */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        {/* Mic button */}
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!supported || loading}
          title={supported ? (listening ? 'Stop listening' : 'Start voice input') : 'Voice not supported in this browser'}
          className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 border-2
            ${listening
              ? 'bg-red-500 border-red-400 mic-active text-white'
              : supported
                ? 'bg-brand-700 border-brand-500 hover:bg-brand-600 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'}
          `}
        >
          {listening ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
            </svg>
          )}
        </button>

        {/* Text input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? 'Listening...' : PLACEHOLDERS[mode]}
          disabled={loading}
          className={`
            flex-1 bg-slate-800 border rounded-xl px-4 py-3 text-slate-100
            placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500
            transition-colors duration-200
            ${listening ? 'border-red-500 bg-red-950/20' : 'border-slate-600 hover:border-slate-500'}
            disabled:opacity-60
          `}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="
            flex-shrink-0 px-6 py-3 bg-brand-600 hover:bg-brand-500
            disabled:bg-slate-700 disabled:text-slate-500
            text-white font-semibold rounded-xl transition-all duration-200
            flex items-center gap-2
          "
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Check Auth
            </>
          )}
        </button>
      </form>

      {/* Listening indicator */}
      {listening && (
        <div className="flex items-center gap-2 text-red-400 text-sm animate-pulse">
          <span className="w-2 h-2 bg-red-400 rounded-full"/>
          Listening — speak now...
        </div>
      )}

      {/* Quick demo pills */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center">Quick demo:</span>
        {DEMO_EXAMPLES[mode].slice(0, 3).map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setText(ex); onSubmit(ex) }}
            disabled={loading}
            className="
              text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700
              border border-slate-600 hover:border-slate-500
              text-slate-300 rounded-full transition-colors disabled:opacity-50
            "
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
