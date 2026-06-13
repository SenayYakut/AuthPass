'use client'

import { useEffect, useRef, useState } from 'react'
import type { AgentStatus, AgentMessage } from '@/hooks/useVoiceAgent'

interface Props {
  status: AgentStatus
  messages: AgentMessage[]
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
  onSendText: (text: string) => void
  mode: 'clinician' | 'staff'
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Ready',
  connecting: 'Connecting to Grok Voice...',
  active: 'Listening',
  error: 'Error',
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: 'bg-slate-600',
  connecting: 'bg-amber-500 animate-pulse',
  active: 'bg-emerald-500',
  error: 'bg-red-500',
}

export default function VoiceAgentUI({
  status, messages, error, onConnect, onDisconnect, onSendText, mode,
}: Props) {
  const [textInput, setTextInput] = useState('')
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim()) return
    onSendText(textInput.trim())
    setTextInput('')
  }

  const isActive = status === 'active'
  const isConnecting = status === 'connecting'
  const isIdle = status === 'idle' || status === 'error'

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`} />
          <span className="text-sm text-slate-400">{STATUS_LABEL[status]}</span>
          {isActive && (
            <span className="text-xs text-slate-500">
              — say &quot;{mode === 'clinician' ? 'Humira, John Doe, Aetna' : 'John Doe, Humira, Aetna'}&quot;
            </span>
          )}
        </div>
        {isActive && (
          <span className="text-xs text-emerald-400 font-medium">
            grok-voice-latest · Eve
          </span>
        )}
      </div>

      {/* Mic button + transcript area */}
      <div className="flex flex-col items-center gap-5">
        {/* Big mic button */}
        <button
          onClick={isIdle ? onConnect : onDisconnect}
          disabled={isConnecting}
          aria-label={isIdle ? 'Start voice session' : 'End voice session'}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 border-2 shadow-lg
            ${isConnecting
              ? 'bg-amber-600 border-amber-400 cursor-wait'
              : isActive
                ? 'bg-red-600 border-red-400 hover:bg-red-500 mic-active'
                : 'bg-brand-700 border-brand-500 hover:bg-brand-600 hover:scale-105'}
            disabled:opacity-50
          `}
        >
          {isActive ? (
            // Stop icon
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : isConnecting ? (
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            // Mic icon
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
            </svg>
          )}
        </button>

        <p className="text-xs text-slate-500">
          {isIdle
            ? 'Tap to start Grok Voice session'
            : isConnecting
              ? 'Establishing secure connection...'
              : 'Tap to end session'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Transcript */}
      {messages.length > 0 && (
        <div
          ref={transcriptRef}
          className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-start transition-opacity ${msg.interrupted ? 'opacity-40' : 'opacity-100'}`}
            >
              {/* Avatar */}
              <div className={`
                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5
                ${msg.role === 'user' ? 'bg-brand-700 text-white' : 'bg-slate-700 text-slate-300'}
              `}>
                {msg.role === 'user' ? 'U' : 'G'}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm leading-relaxed ${
                  msg.role === 'user' ? 'text-slate-200' : 'text-slate-400'
                }`}>
                  {msg.text || (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                {msg.interrupted && (
                  <div className="text-xs text-slate-600 mt-0.5">interrupted</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text input (secondary, shown when active) */}
      {isActive && (
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Or type: Humira, John Doe, Aetna"
            className="
              flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5
              text-sm text-slate-100 placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-brand-500
            "
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm rounded-xl transition-colors"
          >
            Send
          </button>
        </form>
      )}

      {/* Demo hint (idle) */}
      {isIdle && !error && (
        <div className="text-center text-xs text-slate-600">
          Requires xAI API key with Voice endpoint enabled · Chrome / Edge recommended
        </div>
      )}
    </div>
  )
}
