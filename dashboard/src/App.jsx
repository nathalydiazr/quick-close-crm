import { useState, useEffect, useCallback } from 'react'
import { supabase, fetchLeads, fetchUserCompanies, subscribeToLeads, signOut } from './lib/supabase'
import Navbar from './components/Navbar'
import MetricsBar from './components/MetricsBar'
import LeadBoard from './components/LeadBoard'
import ConversationModal from './components/ConversationModal'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [companies, setCompanies] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  // ── Auth state ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) {
        // Logged out — reset state
        setLeads([])
        setCompanies([])
        setSelectedCompany('all')
        setSelectedLead(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Load companies from Supabase (RLS-filtered per user) ─────
  useEffect(() => {
    if (!session) return
    fetchUserCompanies()
      .then((list) => {
        setCompanies(list)
        const admin = list.some((c) => c.role === 'admin')
        setIsAdmin(admin)
        // Clients have exactly one company — auto-select it, no dropdown needed
        if (!admin && list.length === 1) {
          setSelectedCompany(list[0].id)
        }
      })
      .catch((err) => console.warn('Could not load companies:', err.message))
  }, [session])

  // ── Load leads ───────────────────────────────────────────────
  const loadLeads = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLeads(selectedCompany)
      setLeads(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedCompany, session])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  // ── Real-time subscription ───────────────────────────────────
  useEffect(() => {
    if (!session) return
    const unsubscribe = subscribeToLeads(selectedCompany, (payload) => {
      setIsLive(true)
      if (payload.eventType === 'INSERT') {
        setLeads((prev) => [payload.new, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === payload.new.id ? payload.new : lead))
        )
      } else if (payload.eventType === 'DELETE') {
        setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id))
      }
    })
    return unsubscribe
  }, [selectedCompany, session])

  const handleSelectCompany = (companyId) => {
    setSelectedCompany(companyId)
    setSelectedLead(null)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out error:', err.message)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  // Still resolving session from localStorage
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        companies={companies}
        selectedCompany={selectedCompany}
        onSelectCompany={handleSelectCompany}
        isAdmin={isAdmin}
        isLive={isLive}
        onRefresh={loadLeads}
        lastRefresh={lastRefresh}
        userEmail={session.user.email}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <strong>Error:</strong> {error} — Check your Supabase credentials in <code>.env</code>
          </div>
        )}

        <MetricsBar leads={leads} loading={loading} />

        <LeadBoard
          leads={leads}
          loading={loading}
          onSelectLead={setSelectedLead}
        />
      </main>

      {selectedLead && (
        <ConversationModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}
