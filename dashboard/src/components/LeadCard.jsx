import { MessageCircle, Clock, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TEMP_CONFIG = {
  hot: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-400',
    emoji: '🔥',
    label: 'Hot',
    ring: 'ring-red-200',
    accent: 'bg-red-500',
  },
  warm: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
    emoji: '🌡️',
    label: 'Warm',
    ring: 'ring-amber-200',
    accent: 'bg-amber-500',
  },
  cold: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
    emoji: '❄️',
    label: 'Cold',
    ring: 'ring-blue-200',
    accent: 'bg-blue-500',
  },
}

const STATUS_CONFIG = {
  active: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active' },
  won: { badge: 'bg-violet-50 text-violet-700 border-violet-200', label: '✓ Won' },
  lost: { badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Lost' },
}

function Avatar({ username }) {
  const initials = username
    .replace('@', '')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
      {initials}
    </div>
  )
}

export default function LeadCard({ lead, onClick }) {
  const temp = TEMP_CONFIG[lead.temperature] || TEMP_CONFIG.cold
  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.active

  const timeAgo = lead.updated_at
    ? formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })
    : '—'

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer group overflow-hidden animate-slide-up"
    >
      {/* Top accent line */}
      <div className={`h-1 ${temp.accent}`} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar username={lead.instagram_username} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                @{lead.instagram_username}
              </p>
              <p className="text-xs text-slate-400 truncate">{lead.company_id}</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1"
          />
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`badge ${temp.badge}`}>
            <span>{temp.emoji}</span>
            {temp.label}
          </span>
          <span className={`badge ${statusCfg.badge}`}>{statusCfg.label}</span>
        </div>

        {/* Close reason */}
        {lead.close_reason && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
            {lead.close_reason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MessageCircle size={12} />
            <span>{lead.message_count || 0} msgs</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={12} />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
