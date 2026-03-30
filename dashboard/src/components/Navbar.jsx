import { RefreshCw, Zap, Bot, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Navbar({ companies, selectedCompany, onSelectCompany, isAdmin, isLive, onRefresh, lastRefresh, userEmail, onSignOut }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <Bot size={16} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900 leading-none">Quick Close CRM</p>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Instagram AI</p>
          </div>
        </div>

        {/* Company — dropdown for admins, plain label for clients */}
        <div className="flex items-center gap-2 min-w-0">
          {isAdmin ? (
            <>
              <label className="text-xs font-medium text-slate-500 hidden md:block shrink-0">
                Company
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => onSelectCompany(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer min-w-0 max-w-xs truncate"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-700 truncate max-w-xs">
              {companies.find((c) => c.id === selectedCompany)?.name ?? ''}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Last refresh */}
          {lastRefresh && (
            <span className="hidden lg:block text-xs text-slate-400">
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-violet-200"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Real-time badge */}
          {isLive && (
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold animate-fade-in">
              <Zap size={11} />
              Real-time
            </div>
          )}

          {/* User + sign out */}
          {userEmail && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="hidden lg:block text-xs text-slate-500 max-w-[140px] truncate">
                {userEmail}
              </span>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
