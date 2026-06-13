import type { PatientData } from '@/lib/api'

interface Props { patient: PatientData }

export default function PatientCard({ patient }: Props) {
  const labs = Object.values(patient.key_labs).slice(0, 4)

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-bold text-white">
              {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg leading-tight">{patient.name}</h3>
              <p className="text-slate-400 text-xs">
                {patient.age}y · {patient.gender} · DOB {patient.dob}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-slate-400">Member ID</div>
          <div className="text-sm font-mono text-slate-200">{patient.member_id}</div>
          <div className="text-xs text-brand-400 mt-1">{patient.insurance}</div>
        </div>
      </div>

      {/* Physician */}
      <div className="text-xs text-slate-400">
        <span className="text-slate-500">Physician: </span>{patient.physician}
      </div>

      {/* Conditions */}
      {patient.conditions.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Diagnoses</div>
          <div className="flex flex-wrap gap-2">
            {patient.conditions.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-full">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active Meds */}
      {patient.active_medications.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Current Medications</div>
          <div className="flex flex-wrap gap-2">
            {patient.active_medications.map((m) => (
              <span key={m} className="text-xs px-2.5 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Labs */}
      {labs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Key Labs / Scores</div>
          <div className="grid grid-cols-2 gap-2">
            {labs.map((lab) => (
              <div key={lab.display} className="bg-slate-900/60 rounded-lg px-3 py-2">
                <div className="text-xs text-slate-500 truncate">{lab.display}</div>
                <div className="text-sm font-semibold text-white">
                  {lab.value}{lab.unit ? <span className="text-xs text-slate-400 ml-1">{lab.unit}</span> : null}
                </div>
                {lab.date && <div className="text-xs text-slate-600">{lab.date}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
