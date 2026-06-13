interface Props {
  medication: string
  insurance: string
  authRequired: boolean
  confidence: number
  waitTime: string
  policySummary: string
  metRequirements: string[]
  missingDocs: string[]
  failedCriteria: string[]
}

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-emerald-500' :
    value >= 70 ? 'bg-yellow-500' :
    value >= 50 ? 'bg-orange-500' : 'bg-red-500'

  const label =
    value >= 80 ? 'HIGH' :
    value >= 70 ? 'MODERATE' :
    value >= 50 ? 'LOW' : 'VERY LOW'

  const textColor =
    value >= 80 ? 'text-emerald-400' :
    value >= 70 ? 'text-yellow-400' :
    value >= 50 ? 'text-orange-400' : 'text-red-400'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Approval confidence</span>
        <span className={`text-sm font-bold ${textColor}`}>
          {value}% <span className="text-xs font-normal">{label}</span>
        </span>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function AuthDecisionCard({
  medication, insurance, authRequired, confidence,
  waitTime, policySummary, metRequirements, missingDocs, failedCriteria,
}: Props) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-5 animate-slide-up">
      {/* Auth required badge */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white text-base">
            {medication}
            <span className="text-slate-400 font-normal"> via </span>
            {insurance}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{policySummary}</p>
        </div>
        <div className={`
          flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
          ${authRequired
            ? 'bg-amber-900/60 border border-amber-700 text-amber-300'
            : 'bg-emerald-900/60 border border-emerald-700 text-emerald-300'}
        `}>
          {authRequired ? 'Auth Required' : 'No Auth Needed'}
        </div>
      </div>

      {/* Confidence bar */}
      {authRequired && <ConfidenceBar value={confidence} />}

      {/* Wait time */}
      {authRequired && (
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-slate-400">Estimated wait:</span>
          <span className="text-amber-400 font-semibold">{waitTime}</span>
        </div>
      )}

      {/* Met criteria */}
      {metRequirements.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Criteria Met ({metRequirements.length})
          </div>
          <ul className="space-y-1.5">
            {metRequirements.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-emerald-300">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Failed criteria */}
      {failedCriteria.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Criteria Not Met ({failedCriteria.length})
          </div>
          <ul className="space-y-1.5">
            {failedCriteria.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-red-300">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing docs */}
      {missingDocs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Missing Documentation ({missingDocs.length})
          </div>
          <ul className="space-y-1.5">
            {missingDocs.map((d) => (
              <li key={d} className="flex gap-2 text-sm text-amber-300">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
