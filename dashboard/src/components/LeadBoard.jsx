import { MessageCircle, Clock, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Shared avatar ──────────────────────────────────────────
function Avatar({ username, size = 'md' }) {
  const initials = username.replace('@', '').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  )
}

// ─── Temperature badge ───────────────────────────────────────
const TEMP = {
  hot:  { label: '🔥 Hot',  cls: 'bg-red-100 text-red-700 border border-red-200' },
  warm: { label: '🌡️ Warm', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  cold: { label: '❄️ Cold', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
}

const TEMP_ORDER = { hot: 0, warm: 1, cold: 2 }

// ─── Skeleton ────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-28 bg-slate-100 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="h-3 w-2/3 bg-slate-100 rounded" />
    </div>
  )
}

// ─── Ventas Cerradas card ────────────────────────────────────
function WonCard({ lead, onClick }) {
  const closedAt = lead.updated_at
    ? format(new Date(lead.updated_at), "d MMM yyyy, HH:mm", { locale: es })
    : '—'

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-white rounded-xl border border-emerald-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all group"
    >
      {/* Green top accent */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar username={lead.instagram_username} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">
              @{lead.instagram_username}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-600 font-medium">Venta cerrada</p>
            </div>
          </div>
        </div>

        {/* Voucher image */}
        {lead.voucher_url ? (
          <div className="relative rounded-lg overflow-hidden border border-emerald-100 bg-emerald-50">
            <img
              src={lead.voucher_url}
              alt="Comprobante de pago"
              className="w-full h-28 object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="hidden items-center justify-center gap-1.5 h-28 text-emerald-600 text-xs">
              <ImageIcon size={14} />
              <span>Comprobante adjunto</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 h-14 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
            <ImageIcon size={13} />
            <span>Sin comprobante</span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-slate-400 pt-1 border-t border-slate-100">
          <Clock size={11} />
          <span>{closedAt}</span>
        </div>
      </div>
    </div>
  )
}

// ─── En Conversación card ────────────────────────────────────
function ActiveCard({ lead, onClick }) {
  const temp = TEMP[lead.temperature] || TEMP.cold
  const ACCENT = { hot: 'bg-red-500', warm: 'bg-amber-500', cold: 'bg-blue-400' }
  const timeAgo = lead.updated_at
    ? formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: es })
    : '—'

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
    >
      {/* Temperature accent bar */}
      <div className={`h-1 ${ACCENT[lead.temperature] || ACCENT.cold}`} />

      <div className="p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Avatar username={lead.instagram_username} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">
              @{lead.instagram_username}
            </p>
            <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${temp.cls}`}>
              {temp.label}
            </span>
          </div>
        </div>

        {/* Why not closed yet */}
        {lead.close_reason && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 bg-slate-50 rounded-lg px-2.5 py-2">
            {lead.close_reason}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MessageCircle size={11} />
            <span>{lead.message_count || 0} msgs</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={11} />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Column header ───────────────────────────────────────────
function ColumnHeader({ title, count, icon, headerCls, badgeCls, loading }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${headerCls}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>
        {loading ? '—' : count}
      </span>
    </div>
  )
}

// ─── Main board ──────────────────────────────────────────────
export default function LeadBoard({ leads, loading, onSelectLead }) {
  const wonLeads = leads
    .filter((l) => l.status === 'won')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  const activeLeads = leads
    .filter((l) => l.status === 'active')
    .sort((a, b) => (TEMP_ORDER[a.temperature] ?? 2) - (TEMP_ORDER[b.temperature] ?? 2))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

      {/* ── Ventas Cerradas ── */}
      <div className="flex flex-col gap-3">
        <ColumnHeader
          icon="✅"
          title="Ventas Cerradas"
          count={wonLeads.length}
          headerCls="bg-gradient-to-b from-emerald-50 to-transparent border-emerald-200 text-emerald-800"
          badgeCls="bg-emerald-100 text-emerald-700"
          loading={loading}
        />
        <div className="flex flex-col gap-3 min-h-[200px]">
          {loading ? (
            <><Skeleton /><Skeleton /></>
          ) : wonLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-emerald-200 text-slate-400 text-sm gap-2">
              <span className="text-3xl">✅</span>
              <p>Aún no hay ventas cerradas.</p>
              <p className="text-xs text-slate-300">Cuando un cliente envíe su comprobante, aparecerá aquí.</p>
            </div>
          ) : (
            wonLeads.map((lead) => (
              <WonCard key={lead.id} lead={lead} onClick={onSelectLead} />
            ))
          )}
        </div>
      </div>

      {/* ── En Conversación ── */}
      <div className="flex flex-col gap-3">
        <ColumnHeader
          icon="💬"
          title="En Conversación"
          count={activeLeads.length}
          headerCls="bg-gradient-to-b from-violet-50 to-transparent border-violet-200 text-violet-800"
          badgeCls="bg-violet-100 text-violet-700"
          loading={loading}
        />
        <div className="flex flex-col gap-3 min-h-[200px]">
          {loading ? (
            <><Skeleton /><Skeleton /><Skeleton /></>
          ) : activeLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-violet-200 text-slate-400 text-sm gap-2">
              <span className="text-3xl">💬</span>
              <p>No hay conversaciones activas.</p>
            </div>
          ) : (
            activeLeads.map((lead) => (
              <ActiveCard key={lead.id} lead={lead} onClick={onSelectLead} />
            ))
          )}
        </div>
      </div>

    </div>
  )
}
