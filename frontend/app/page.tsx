'use client'

import { useCallback, useState } from 'react'
import type { Mode, ProcessResponse } from '@/lib/api'
import { processRequest } from '@/lib/api'
import { useVoiceAgent } from '@/hooks/useVoiceAgent'
import VoiceAgentUI from '@/components/VoiceAgentUI'
import PatientCard from '@/components/PatientCard'
import AuthDecisionCard from '@/components/AuthDecisionCard'
import AlternativesCard from '@/components/AlternativesCard'
import AuthLetterCard from '@/components/AuthLetterCard'
import HITLBanner from '@/components/HITLBanner'
import HITLReviewPanel from '@/components/HITLReviewPanel'

export default function Home() {
  const [mode, setMode] = useState<Mode>('clinician')
  const [result, setResult] = useState<ProcessResponse | null>(null)
  const [textLoading, setTextLoading] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)

  // Called both by voice agent (tool result) and the quick-demo text buttons
  const handleAuthResult = useCallback((res: ProcessResponse) => {
    setResult(res)
    setTextError(null)
  }, [])

  const voiceAgent = useVoiceAgent(mode, handleAuthResult)

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode)
    setResult(null)
    setTextError(null)
    if (voiceAgent.status !== 'idle') voiceAgent.disconnect()
  }

  // Quick-demo text shortcut (bypasses voice, calls backend directly)
  const handleQuickDemo = async (text: string) => {
    setTextLoading(true)
    setTextError(null)
    setResult(null)
    try {
      const data = await processRequest(mode, text)
      handleAuthResult(data)
    } catch (err) {
      setTextError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setTextLoading(false)
    }
  }

  const DEMOS: Record<Mode, string[]> = {
    clinician: ['Humira, John Doe, Aetna', 'Ozempic, Maria Rodriguez, UHC', 'Enbrel, David Park, UHC'],
    staff: ['John Doe, Humira, Aetna', 'Susan Chen, Keytruda, Aetna', 'David Park, Enbrel, UHC'],
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-white text-lg leading-tight">AuthPass</div>
              <div className="text-xs text-slate-500">Legion Health · Prior Auth AI</div>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
            {(['clinician', 'staff'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeSwitch(m)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${mode === m ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}
                `}
              >
                {m === 'clinician' ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Clinician
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Staff
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-300">grok-voice-latest</span>
          </div>
        </div>
      </header>

      {/* Mode banner */}
      <div className={`border-b px-4 py-2.5 text-center text-sm transition-colors duration-300 ${
        mode === 'clinician'
          ? 'bg-brand-900/20 border-brand-900/40 text-brand-300'
          : 'bg-purple-900/20 border-purple-900/40 text-purple-300'
      }`}>
        {mode === 'clinician'
          ? <><strong>Clinician Mode</strong> — Check auth before prescribing. Grok speaks the result + best no-auth alternative.</>
          : <><strong>Staff Mode</strong> — Auto-generates auth letter. Cases under 70% confidence flagged for senior review.</>}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Voice agent panel */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-5 h-5 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
            </svg>
            <h2 className="text-sm font-semibold text-slate-300">
              Grok Voice Agent — speak your prior auth request
            </h2>
          </div>

          <VoiceAgentUI
            status={voiceAgent.status}
            messages={voiceAgent.messages}
            error={voiceAgent.error}
            onConnect={voiceAgent.connect}
            onDisconnect={voiceAgent.disconnect}
            onSendText={voiceAgent.sendText}
            mode={mode}
          />

          {/* Text input — type any patient */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-3">
            <form
              onSubmit={e => {
                e.preventDefault()
                const val = (e.currentTarget.elements.namedItem('query') as HTMLInputElement).value.trim()
                if (val) handleQuickDemo(val)
              }}
              className="flex gap-2"
            >
              <input
                name="query"
                type="text"
                placeholder={
                  mode === 'clinician'
                    ? 'Type: Medication, Patient Name, Insurance — e.g. Humira, John Doe, Aetna'
                    : 'Type: Patient Name, Medication, Insurance — e.g. John Doe, Humira, Aetna'
                }
                disabled={textLoading || voiceAgent.status === 'active'}
                className="
                  flex-1 bg-slate-800 border border-slate-600 hover:border-slate-500
                  rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-brand-500
                  disabled:opacity-50 transition-colors
                "
              />
              <button
                type="submit"
                disabled={textLoading || voiceAgent.status === 'active'}
                className="
                  flex-shrink-0 px-5 py-3 bg-brand-600 hover:bg-brand-500
                  disabled:bg-slate-700 disabled:text-slate-500
                  text-white text-sm font-semibold rounded-xl transition-colors
                  flex items-center gap-2
                "
              >
                {textLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                )}
                Check
              </button>
            </form>

            {/* Demo pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">Or try:</span>
              {DEMOS[mode].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleQuickDemo(ex)}
                  disabled={textLoading || voiceAgent.status === 'active'}
                  className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-full transition-colors disabled:opacity-40"
                >
                  {ex}
                </button>
              ))}
              {textLoading && <span className="text-xs text-slate-500 animate-pulse">Checking...</span>}
            </div>
          </div>
        </section>

        {/* Text-path error */}
        {textError && (
          <div className="bg-red-950/60 border border-red-800 rounded-2xl p-5 text-red-300 text-sm">
            <strong className="text-red-400">Error: </strong>{textError}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5 animate-fade-in">
            {result.hitl_flag && (
              <>
                <HITLBanner reason={result.hitl_reason} confidence={result.confidence} />
                {mode === 'staff' && (
                  <HITLReviewPanel result={result} onResolved={handleAuthResult} />
                )}
              </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-5">
                {result.patient && <PatientCard patient={result.patient} />}
                {mode === 'clinician' && result.auth_required && (
                  <AlternativesCard alternatives={result.alternatives} requestedMed={result.medication} />
                )}
              </div>
              <div className="space-y-5">
                <AuthDecisionCard
                  medication={result.medication}
                  insurance={result.insurance}
                  authRequired={result.auth_required}
                  confidence={result.confidence}
                  waitTime={result.wait_time}
                  policySummary={result.policy_summary}
                  metRequirements={result.met_requirements}
                  missingDocs={result.missing_docs}
                  failedCriteria={result.failed_criteria}
                />
                {mode === 'staff' && result.auth_letter && (
                  <AuthLetterCard letter={result.auth_letter} />
                )}
              </div>
            </div>

            {!result.auth_required && (
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-5 text-center">
                <div className="text-emerald-400 text-2xl mb-2">✓</div>
                <div className="text-emerald-300 font-semibold">No prior authorization required</div>
                <div className="text-emerald-500 text-sm mt-1">{result.policy_summary}</div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !textLoading && !textError && voiceAgent.status === 'idle' && (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Tap the mic or a demo pill to begin</div>
              <div className="text-slate-600 text-sm mt-1">
                Voice: tap mic → speak medication, patient, insurance<br />
                Demo: click a pill below the mic button
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-slate-800 mt-16 py-6 text-center text-xs text-slate-600">
        AuthPass · Legion Health · AI-assisted, not AI-decided · All clinical decisions require physician judgment
      </footer>
    </main>
  )
}
