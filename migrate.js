/**
 * migrate.js — drops existing tables and applies supabase/schema.sql
 *
 * Requires a Supabase Personal Access Token (PAT):
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node migrate.js
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PROJECT_REF = 'dhmmmhfjxomaldorspkz'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('\n❌  Missing SUPABASE_ACCESS_TOKEN')
  console.error('    Get yours at: https://supabase.com/dashboard/account/tokens')
  console.error('    Then run:     SUPABASE_ACCESS_TOKEN=sbp_xxx node migrate.js\n')
  process.exit(1)
}

const schema = readFileSync(join(__dirname, 'supabase/schema.sql'), 'utf8')

const DROP = `
DROP TABLE IF EXISTS messages      CASCADE;
DROP TABLE IF EXISTS leads         CASCADE;
DROP TABLE IF EXISTS company_users CASCADE;
DROP TABLE IF EXISTS companies     CASCADE;
`

async function runSQL(sql, label) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${body.message || JSON.stringify(body)}`)
  }

  return body
}

console.log('\n🔄  Running migration against project:', PROJECT_REF)

try {
  process.stdout.write('   Dropping existing tables... ')
  await runSQL(DROP, 'DROP')
  console.log('✅')

  process.stdout.write('   Applying schema.sql...       ')
  await runSQL(schema, 'SCHEMA')
  console.log('✅')

  console.log('\n🎉  Migration complete. Tables ready:\n')
  console.log('   • companies     (id, name)')
  console.log('   • company_users (user_id → auth.users, company_id → companies)')
  console.log('   • leads         (id, company_id, instagram_username, thread_id, temperature, status, …)')
  console.log('   • messages      (id, lead_id, role, content, created_at)')
  console.log('\n💡  Next: run `node add_client.js <company_id> <email> <password>` to create a login.\n')
} catch (err) {
  console.error('\n❌ ', err.message)
  if (err.message.includes('401')) {
    console.error('    Token looks invalid. Re-generate at: https://supabase.com/dashboard/account/tokens')
  }
  process.exit(1)
}
