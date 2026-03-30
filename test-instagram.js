/**
 * test-instagram.js — Simulates 5 realistic Instagram DM scenarios
 *
 * Usage: node test-instagram.js
 */

const BASE_URL = 'http://localhost:3000/webhook/instagram/home-products1324'

const SCENARIOS = [
  {
    label: '💬 Price Inquiry',
    payload: {
      instagram_username: 'maria_decoraciones',
      instagram_user_id: '201001',
      thread_id: 'thread_maria_001',
      message: 'Hola! Vi tu publicación de las cortinas blackout. ¿Cuánto cuestan? ¿Tienen en color beige o gris?',
    },
  },
  {
    label: '🔥 Ready to Buy',
    payload: {
      instagram_username: 'carlos_nuevo_apto',
      instagram_user_id: '201002',
      thread_id: 'thread_carlos_002',
      message: 'Buenas, quiero pedir las cortinas blackout para 3 ventanas grandes. ¿Cómo hago el pedido y aceptan transferencia bancaria? Lo necesito para el viernes.',
    },
  },
  {
    label: '🤔 Objections',
    payload: {
      instagram_username: 'lucia_presupuesto',
      instagram_user_id: '201003',
      thread_id: 'thread_lucia_003',
      message: 'Me interesan pero me parecen caras comparadas con otras tiendas. ¿Tienen algo más económico? Además, ¿qué garantía tienen si el producto llega defectuoso?',
    },
  },
  {
    label: '❄️ Cold / Uninterested',
    payload: {
      instagram_username: 'jorge_mirando',
      instagram_user_id: '201004',
      thread_id: 'thread_jorge_004',
      message: 'ok gracias',
    },
  },
  {
    label: '✅ Payment Voucher',
    payload: {
      instagram_username: 'carlos_nuevo_apto',
      instagram_user_id: '201002',
      thread_id: 'thread_carlos_002',
      message: 'Listo! Ya hice la transferencia, te mando el comprobante.',
      image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    },
  },
]

const TEMP_COLOR = { hot: '\x1b[31m', warm: '\x1b[33m', cold: '\x1b[34m' }
const STATUS_COLOR = { won: '\x1b[32m', active: '\x1b[36m', lost: '\x1b[90m' }
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

function divider(char = '─', len = 60) {
  return DIM + char.repeat(len) + RESET
}

async function sendMessage(scenario) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario.payload),
  })
  return res.json()
}

async function run() {
  console.log('\n' + BOLD + '🤖  Quick Close CRM — Instagram DM Simulator' + RESET)
  console.log(DIM + '    Endpoint: ' + BASE_URL + RESET)
  console.log(divider('═') + '\n')

  for (const [i, scenario] of SCENARIOS.entries()) {
    console.log(BOLD + `Scenario ${i + 1}/5 — ${scenario.label}` + RESET)
    console.log(divider())

    const { payload } = scenario
    console.log(`${DIM}@${payload.instagram_username}${RESET}`)
    console.log(`${DIM}💬 "${payload.message}"${payload.image_url ? '\n🖼️  [image attached]' : ''}${RESET}\n`)

    let result
    try {
      result = await sendMessage(scenario)
    } catch (err) {
      console.log(`\x1b[31m❌ Request failed: ${err.message}\x1b[0m\n`)
      continue
    }

    if (!result.success) {
      console.log(`\x1b[31m❌ Error: ${result.error}\x1b[0m\n`)
      continue
    }

    const { lead } = result
    const tempCol = TEMP_COLOR[lead.temperature] || ''
    const statusCol = STATUS_COLOR[lead.status] || ''

    const tempLabel  = { hot: '🔥 Hot', warm: '🌡️  Warm', cold: '❄️  Cold' }[lead.temperature] ?? lead.temperature
    const statusLabel = { won: '🏆 Won', active: '⚡ Active', lost: '💀 Lost' }[lead.status] ?? lead.status

    console.log(`${BOLD}Agent response:${RESET}`)
    console.log(`"${result.response}"\n`)

    console.log(
      `Lead: ${tempCol}${BOLD}${tempLabel}${RESET}  ` +
      `Status: ${statusCol}${BOLD}${statusLabel}${RESET}` +
      (lead.voucher_detected ? '  \x1b[32m✅ VOUCHER DETECTED\x1b[0m' : '')
    )
    console.log(`${DIM}${lead.close_reason}${RESET}`)

    console.log('\n' + divider() + '\n')

    // Small delay between requests
    if (i < SCENARIOS.length - 1) await new Promise((r) => setTimeout(r, 300))
  }

  console.log(BOLD + '✅  All scenarios complete.\n' + RESET)
}

run()
