-- Instagram Sales Agent — Supabase Schema
-- Run via: SUPABASE_ACCESS_TOKEN=sbp_xxx node migrate.js

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- COMPANIES TABLE (lightweight registry)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- COMPANY_USERS — links auth.users → company
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_user_id    ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);

-- ─────────────────────────────────────────────
-- LEADS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  instagram_username TEXT NOT NULL,
  instagram_user_id  TEXT,
  thread_id          TEXT NOT NULL,
  temperature        TEXT NOT NULL DEFAULT 'cold'
                       CHECK (temperature IN ('hot', 'warm', 'cold')),
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'won', 'lost')),
  close_reason       TEXT DEFAULT 'New lead',
  voucher_url        TEXT,
  message_count      INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (company_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_company_id  ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at  ON leads(updated_at DESC);

-- ─────────────────────────────────────────────
-- MESSAGES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_lead_id    ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages     ENABLE ROW LEVEL SECURITY;

-- companies_users: users can only see their own rows
CREATE POLICY "Users see own company_users" ON company_users
  FOR SELECT USING (user_id = auth.uid());

-- companies: users can see companies they belong to
CREATE POLICY "Users see own companies" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- leads: users can only see leads from their company
CREATE POLICY "Users see own company leads" ON leads
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- messages: users can only see messages for leads from their company
CREATE POLICY "Users see own company messages" ON messages
  FOR SELECT USING (
    lead_id IN (
      SELECT l.id FROM leads l
      JOIN company_users cu ON cu.company_id = l.company_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- Service role (server.js) bypasses RLS automatically — no extra policies needed.

-- ─────────────────────────────────────────────
-- REALTIME (enable for dashboard live updates)
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
