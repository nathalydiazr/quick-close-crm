import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars. Copy dashboard/.env.example to dashboard/.env and fill in your keys.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── Data helpers ────────────────────────────────────────────

export async function fetchLeads(companyId) {
  const query = supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })

  if (companyId && companyId !== 'all') {
    query.eq('company_id', companyId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchMessages(leadId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function fetchUserCompanies() {
  const { data, error } = await supabase
    .from('company_users')
    .select('role, companies(id, name)')

  if (error) throw error
  return (data || []).map((row) => ({ ...row.companies, role: row.role })).filter((c) => c.id)
}

// ─── Real-time subscription ──────────────────────────────────

export function subscribeToLeads(companyId, onUpdate) {
  const channel = supabase
    .channel('leads-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
        ...(companyId && companyId !== 'all' ? { filter: `company_id=eq.${companyId}` } : {}),
      },
      onUpdate
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
