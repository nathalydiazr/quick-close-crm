/**
 * add_client.js — Create a new client user and link them to a company.
 *
 * Creates the user in Supabase Auth and inserts a row in company_users
 * so RLS allows them to see only their company's data.
 *
 * Usage:
 *   node add_client.js <company_id> <email> <password>
 *
 * Example:
 *   node add_client.js accesorios-bella admin@bella.com S3cur3P@ss!
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const [,, companyId, email, password] = process.argv

if (!companyId || !email || !password) {
  console.error('\nUsage: node add_client.js <company_id> <email> <password>\n')
  console.error('  company_id  — must match the id in your configs/ directory')
  console.error('  email       — client login email')
  console.error('  password    — client login password (min 6 chars)\n')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

console.log(`\n🔧  Creating client for company "${companyId}"…`)

// 1. Upsert the company row (so foreign key on company_users doesn't fail)
const { error: companyError } = await supabase
  .from('companies')
  .upsert({ id: companyId, name: companyId }, { onConflict: 'id', ignoreDuplicates: true })

if (companyError) {
  console.error('❌  Could not upsert company:', companyError.message)
  process.exit(1)
}

// 2. Create the auth user
const { data: userData, error: userError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,   // skip email confirmation flow
})

if (userError) {
  console.error('❌  Could not create auth user:', userError.message)
  process.exit(1)
}

const userId = userData.user.id
console.log(`   ✅ Auth user created: ${email} (${userId})`)

// 3. Link user → company
const { error: linkError } = await supabase
  .from('company_users')
  .insert({ user_id: userId, company_id: companyId, role: 'viewer' })

if (linkError) {
  console.error('❌  Could not link user to company:', linkError.message)
  process.exit(1)
}

console.log(`   ✅ Linked to company: ${companyId}`)
console.log(`\n🎉  Done! The client can now log in at the dashboard:`)
console.log(`      Email:    ${email}`)
console.log(`      Password: ${password}`)
console.log(`      Company:  ${companyId}\n`)
