import { Flame, Thermometer, Snowflake, TrendingUp, Users, MessageCircle } from 'lucide-react'

function MetricCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="card px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <>
            <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse mb-1" />
            <div className="h-3.5 w-20 bg-slate-100 rounded-md animate-pulse" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
            {sub && <p className="text-xs font-medium text-slate-400 mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </div>
  )
}

export default function MetricsBar({ leads, loading }) {
  const total = leads.length
  const hot = leads.filter((l) => l.temperature === 'hot').length
  const warm = leads.filter((l) => l.temperature === 'warm').length
  const cold = leads.filter((l) => l.temperature === 'cold').length
  const won = leads.filter((l) => l.status === 'won').length
  const active = leads.filter((l) => l.status === 'active').length
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0


  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        icon={Users}
        label="Total Leads"
        value={total}
        sub={`${active} active`}
        color="bg-violet-100 text-violet-600"
        loading={loading}
      />
      <MetricCard
        icon={Flame}
        label="Hot Leads"
        value={hot}
        sub={total > 0 ? `${Math.round((hot / total) * 100)}% of total` : '—'}
        color="bg-red-100 text-red-600"
        loading={loading}
      />
      <MetricCard
        icon={Thermometer}
        label="Warm Leads"
        value={warm}
        sub={total > 0 ? `${Math.round((warm / total) * 100)}% of total` : '—'}
        color="bg-amber-100 text-amber-600"
        loading={loading}
      />
      <MetricCard
        icon={Snowflake}
        label="Cold Leads"
        value={cold}
        sub={total > 0 ? `${Math.round((cold / total) * 100)}% of total` : '—'}
        color="bg-blue-100 text-blue-600"
        loading={loading}
      />
      <MetricCard
        icon={MessageCircle}
        label="En Conversación"
        value={active}
        sub={won > 0 ? `${won} cerradas` : 'sin cierres aún'}
        color="bg-emerald-100 text-emerald-600"
        loading={loading}
      />
      <MetricCard
        icon={TrendingUp}
        label="Conversion"
        value={`${convRate}%`}
        sub="close rate"
        color="bg-indigo-100 text-indigo-600"
        loading={loading}
      />
    </div>
  )
}
