'use client'

import { useState } from 'react'

interface Props { letter: string }

export default function AuthLetterCard({ letter }: Props) {
  const [copied, setCopied] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = () => {
    // In production: POST to payer portal API
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Auth Letter</div>
          <div className="text-sm text-slate-300 mt-0.5">Ready to submit to payer</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitted}
            className={`
              text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 font-medium
              ${submitted
                ? 'bg-emerald-900 border-emerald-700 text-emerald-300'
                : 'bg-brand-700 hover:bg-brand-600 border-brand-600 text-white'}
            `}
          >
            {submitted ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Submitted!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit to Payer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Letter preview */}
      <pre className="
        bg-slate-900/80 border border-slate-700 rounded-xl p-4
        text-xs text-slate-300 font-mono leading-relaxed
        max-h-80 overflow-y-auto whitespace-pre-wrap break-words
      ">
        {letter}
      </pre>
    </div>
  )
}
