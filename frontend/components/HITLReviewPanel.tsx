'use client'

import { useState } from 'react'
import type { ProcessResponse, RecalculateRequest } from '@/lib/api'
import { recalculate } from '@/lib/api'

interface Props {
  result: ProcessResponse       // original low-confidence result
  onResolved: (updated: ProcessResponse) => void
}

// Map observation codes to human-readable labels + input type
const OBS_META: Record<string, { label: string; unit: string; type: 'number' | 'text'; hint: string }> = {
  pasi:    { label: 'PASI Score',      unit: 'score', type: 'number', hint: 'Need > 10 for UHC/Enbrel' },
  easi:    { label: 'EASI Score',      unit: 'score', type: 'number', hint: 'Need > 16 for BCBS/Dupixent' },
  das28:   { label: 'DAS28 Score',     unit: 'score', type: 'number', hint: 'Need > 3.2 for Aetna/Humira' },
  a1c:     { label: 'A1C',             unit: '%',     type: 'number', hint: 'Need > 7.5% for UHC/Ozempic' },
  bmi:     { label: 'BMI',             unit: 'kg/m²', type: 'number', hint: 'Need > 30 for UHC/Ozempic' },
  pdl1:    { label: 'PD-L1 Expression',unit: '%',     type: 'number', hint: 'Need > 50% for Aetna/Keytruda' },
  tb_test: { label: 'TB Test Result',  unit: '',      type: 'text',   hint: 'Must be Negative' },
}

// Detect which observation codes are relevant to failed/missing criteria
function extractCodes(texts: string[]): string[] {
  const hits: string[] = []
  const combined = texts.join(' ').toLowerCase()
  if (combined.includes('pasi'))        hits.push('pasi')
  if (combined.includes('easi'))        hits.push('easi')
  if (combined.includes('das28'))       hits.push('das28')
  if (combined.includes('a1c') || combined.includes('hba1c')) hits.push('a1c')
  if (combined.includes('bmi'))         hits.push('bmi')
  if (combined.includes('pd-l1') || combined.includes('pdl1')) hits.push('pdl1')
  if (combined.includes('tb test') || combined.includes('quantiferon')) hits.push('tb_test')
  return [...new Set(hits)]
}

function detectMissingMeds(texts: string[]): string[] {
  const combined = texts.join(' ').toLowerCase()
  const meds: string[] = []
  if (combined.includes('dmard'))        meds.push('DMARD (e.g. Methotrexate)')
  if (combined.includes('metformin'))    meds.push('Metformin')
  if (combined.includes('topical steroid') || combined.includes('triamcinolone')) meds.push('Topical steroid (e.g. Triamcinolone 0.1%)')
  if (combined.includes('methotrexate') && combined.includes('psoriati'))         meds.push('Methotrexate')
  if (combined.includes('platinum') || combined.includes('carboplatin'))           meds.push('Platinum chemo (e.g. Carboplatin)')
  return meds
}

export default function HITLReviewPanel({ result, onResolved }: Props) {
  const allIssues = [...result.failed_criteria, ...result.missing_docs]
  const relevantCodes = extractCodes(allIssues)
  const missingMedHints = detectMissingMeds(allIssues)

  const [obsValues, setObsValues] = useState<Record<string, string>>({})
  const [obsNotes, setObsNotes] = useState<Record<string, string>>({})
  const [extraMed, setExtraMed] = useState('')
  const [extraMeds, setExtraMeds] = useState<string[]>([])
  const [attestation, setAttestation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addExtraMed = () => {
    const trimmed = extraMed.trim()
    if (trimmed && !extraMeds.includes(trimmed)) {
      setExtraMeds(prev => [...prev, trimmed])
    }
    setExtraMed('')
  }

  const handleRecalculate = async () => {
    setLoading(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]

    const observation_overrides: RecalculateRequest['observation_overrides'] = {}
    for (const code of relevantCodes) {
      const raw = obsValues[code]
      if (!raw?.trim()) continue
      const meta = OBS_META[code]
      observation_overrides[code] = {
        value: meta.type === 'number' ? parseFloat(raw) : raw.trim(),
        date: today,
        note: obsNotes[code] || 'Updated by staff',
      }
    }

    try {
      const updated = await recalculate({
        patient_name: result.patient?.name ?? '',
        medication: result.medication,
        insurance: result.insurance,
        observation_overrides,
        extra_medications: extraMeds,
        physician_attestation: attestation.trim(),
      })
      onResolved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recalculate failed')
    } finally {
      setLoading(false)
    }
  }

  const hasChanges =
    Object.values(obsValues).some(v => v.trim()) ||
    extraMeds.length > 0 ||
    attestation.trim().length > 0

  return (
    <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-5 space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-900 border border-amber-700 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-amber-300 text-sm">Staff Adjustments</h3>
          <p className="text-xs text-amber-600 mt-0.5">
            Update clinical values or add documentation to improve the auth confidence before submission.
          </p>
        </div>
      </div>

      {/* Observation overrides */}
      {relevantCodes.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Update Clinical Values
          </div>
          {relevantCodes.map(code => {
            const meta = OBS_META[code]
            if (!meta) return null
            return (
              <div key={code} className="bg-slate-900/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    {meta.label} {meta.unit ? <span className="text-slate-500 text-xs">({meta.unit})</span> : null}
                  </label>
                  <span className="text-xs text-amber-500">{meta.hint}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type={meta.type}
                    step={meta.type === 'number' ? '0.1' : undefined}
                    placeholder={`Enter updated ${meta.label}`}
                    value={obsValues[code] ?? ''}
                    onChange={e => setObsValues(prev => ({ ...prev, [code]: e.target.value }))}
                    className="
                      flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                      text-sm text-slate-100 placeholder-slate-600
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50
                    "
                  />
                  <input
                    type="text"
                    placeholder="Source / note"
                    value={obsNotes[code] ?? ''}
                    onChange={e => setObsNotes(prev => ({ ...prev, [code]: e.target.value }))}
                    className="
                      w-40 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                      text-xs text-slate-400 placeholder-slate-600
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50
                    "
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Extra medications */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Add Missing Medication History
        </div>
        {missingMedHints.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs text-slate-600">Suggestions:</span>
            {missingMedHints.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setExtraMeds(prev => prev.includes(h) ? prev : [...prev, h])}
                className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-600 text-slate-400 rounded-full hover:border-amber-600 transition-colors"
              >
                + {h}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Methotrexate 20mg weekly — stopped: inadequate response"
            value={extraMed}
            onChange={e => setExtraMed(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExtraMed()}
            className="
              flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
              text-sm text-slate-100 placeholder-slate-600
              focus:outline-none focus:ring-2 focus:ring-amber-500/50
            "
          />
          <button
            type="button"
            onClick={addExtraMed}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
        {extraMeds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {extraMeds.map(m => (
              <span key={m} className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-600 text-slate-300 px-2.5 py-1 rounded-full">
                {m}
                <button
                  type="button"
                  onClick={() => setExtraMeds(prev => prev.filter(x => x !== m))}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Physician attestation */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Physician Attestation
          <span className="ml-2 text-slate-600 normal-case font-normal">+15% confidence boost</span>
        </div>
        <textarea
          placeholder="e.g. Patient's PASI score has worsened to 12 since last documented assessment on 2026-05-01. Enbrel is medically necessary due to rapid disease progression."
          value={attestation}
          onChange={e => setAttestation(e.target.value)}
          rows={3}
          className="
            w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
            text-sm text-slate-100 placeholder-slate-600 resize-none
            focus:outline-none focus:ring-2 focus:ring-amber-500/50
          "
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Recalculate button */}
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={!hasChanges || loading}
        className="
          w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
          flex items-center justify-center gap-2
          bg-amber-700 hover:bg-amber-600 border border-amber-600 text-white
          disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500
        "
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Recalculating...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recalculate Confidence & Regenerate Letter
          </>
        )}
      </button>
    </div>
  )
}
