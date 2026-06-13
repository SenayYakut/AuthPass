import type { AlternativeMed } from '@/lib/api'

interface Props {
  alternatives: AlternativeMed[]
  requestedMed: string
}

export default function AlternativesCard({ alternatives, requestedMed }: Props) {
  if (!alternatives.length) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 animate-slide-up">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Alternative Medications
        </div>
        <div className="flex items-start gap-3 text-sm text-slate-400">
          <span className="text-slate-600 text-lg mt-0.5">–</span>
          <p>
            No therapeutically equivalent alternatives available for {requestedMed} in this indication.
            Prior authorization is the only pathway.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Alternatives — No Auth Required
        </div>
        <span className="text-xs text-emerald-400 font-medium">Patient gets meds TODAY</span>
      </div>

      <div className="space-y-3">
        {alternatives.map((alt, i) => (
          <div
            key={alt.name}
            className={`
              rounded-xl p-4 border transition-colors
              ${i === 0
                ? 'bg-emerald-950/40 border-emerald-800 hover:border-emerald-600'
                : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {i === 0 && (
                  <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    Recommended
                  </span>
                )}
                <span className="font-semibold text-white">{alt.name}</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                No Auth
              </span>
            </div>
            <p className="text-sm text-slate-400">{alt.efficacy_note}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Switching to an alternative avoids the {'{'}14–21 day{'}'} authorization wait.
        If {requestedMed} is clinically preferred, proceed with the auth request via Staff Mode.
      </p>
    </div>
  )
}
