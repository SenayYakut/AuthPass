interface Props {
  reason: string
  confidence: number
}

export default function HITLBanner({ reason, confidence }: Props) {
  return (
    <div className="
      bg-red-950/60 border border-red-800 rounded-2xl p-5
      flex items-start gap-4 animate-slide-up
    ">
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900 border border-red-700 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-red-400 uppercase tracking-wide">
            Human Review Required
          </span>
          <span className="text-xs bg-red-900 border border-red-700 text-red-300 px-2 py-0.5 rounded-full">
            {confidence}% confidence
          </span>
        </div>
        <p className="text-sm text-red-200">{reason}</p>
        <div className="mt-3 flex gap-2">
          <button className="text-xs px-3 py-1.5 bg-red-900 hover:bg-red-800 border border-red-700 text-red-200 rounded-lg transition-colors">
            Assign to Senior Staff
          </button>
          <button className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg transition-colors">
            Request Peer-to-Peer Review
          </button>
        </div>
      </div>
    </div>
  )
}
