import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'mock' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

// ─────────────────────────────────────────────
// EXPRESS SETUP
// ─────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ─────────────────────────────────────────────
// COMPANY CONFIG LOADER
// ─────────────────────────────────────────────
function loadConfig(companyId) {
  const configPath = join(__dirname, 'configs', `${companyId}.json`)
  if (!existsSync(configPath)) {
    throw new Error(`Company config not found: ${companyId}`)
  }
  return JSON.parse(readFileSync(configPath, 'utf8'))
}

// ─────────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────────
async function getOrCreateLead({ companyId, instagramUsername, instagramUserId, threadId }) {
  // Try to find existing lead by thread
  const { data: existing, error: fetchErr } = await supabase
    .from('leads')
    .select('*')
    .eq('company_id', companyId)
    .eq('thread_id', threadId)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (existing) return existing

  // Create new lead
  const { data: newLead, error: insertErr } = await supabase
    .from('leads')
    .insert({
      company_id: companyId,
      instagram_username: instagramUsername,
      instagram_user_id: instagramUserId || null,
      thread_id: threadId,
      temperature: 'cold',
      status: 'active',
      close_reason: 'New lead — not yet assessed',
      message_count: 0,
    })
    .select()
    .single()

  if (insertErr) throw insertErr
  return newLead
}

async function getMessages(leadId) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

async function saveMessage(leadId, role, content) {
  const { error } = await supabase
    .from('messages')
    .insert({ lead_id: leadId, role, content })
  if (error) throw error
}

async function updateLead(leadId, updates) {
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
  if (error) throw error
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────
function buildSystemPrompt(config) {
  const sellingPoints = Array.isArray(config.selling_points)
    ? config.selling_points.map((p, i) => `  ${i + 1}. ${p}`).join('\n')
    : config.selling_points

  return `You are ${config.agent_name}, a professional sales agent working for ${config.company_name}.

━━━ ABOUT THE COMPANY ━━━
${config.description}

━━━ PRODUCT / SERVICE ━━━
${config.product}

━━━ PRICING ━━━
${config.pricing}

━━━ KEY SELLING POINTS ━━━
${sellingPoints}

━━━ SALES APPROACH ━━━
${config.sales_instructions}

━━━ TONE & STYLE ━━━
${config.tone}

━━━ LANGUAGE ━━━
Always respond in: ${config.language || 'the same language as the customer'}.

━━━ CORE OBJECTIVE ━━━
Your primary mission is to close sales. Every message should advance the customer
toward a purchase decision. Be warm, helpful, and persuasive — never pushy.
Address objections proactively. When you sense readiness, ask for the order.

━━━ LEAD TEMPERATURE CLASSIFICATION ━━━
After every interaction, assess the lead temperature:

🔥 HOT   — Customer is clearly ready to buy. Asking about payment, delivery,
           expressing urgency, or explicitly saying they want to purchase.

🌡️ WARM  — Customer is interested but has doubts, questions, or needs more info.
           Engaged in conversation, asking product questions, comparing options.

❄️ COLD  — Low engagement. Short/passive responses, price objections with no
           follow-through, not responding to closing attempts, or ghosting.

━━━ CLOSING RULES — READ CAREFULLY ━━━
• Set status = "won" ONLY when the customer sends a PAYMENT VOUCHER or payment
  screenshot. A voucher message will say "[VOUCHER RECEIVED: ...]". This is the
  ONLY valid trigger for "won". Do NOT mark as "won" just because the customer
  says they want to buy or asks for payment details — that is still "active".

• Set status = "lost" only when the customer explicitly says they are not buying
  or stops responding after multiple attempts.

• status = "active" for all normal conversation, even if the customer is very
  hot and about to pay. Stay "active" until the actual voucher arrives.

• voucher_detected = true ONLY when you see "[VOUCHER RECEIVED: ...]" in the
  latest message. Otherwise always false.

━━━ TOOL USAGE ━━━
You MUST always call the 'sales_response' tool to deliver your reply.
Never respond in plain text — only through the tool.`
}

// ─────────────────────────────────────────────
// CLAUDE TOOL DEFINITION
// ─────────────────────────────────────────────
const SALES_RESPONSE_TOOL = {
  name: 'sales_response',
  description: 'Send a sales message to the Instagram customer and record the lead assessment.',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The message to send back to the customer. Be conversational and natural.',
      },
      temperature: {
        type: 'string',
        enum: ['hot', 'warm', 'cold'],
        description: 'Lead temperature: hot (ready to buy), warm (interested/engaged), cold (low interest)',
      },
      close_reason: {
        type: 'string',
        description: 'Brief 1-2 sentence explanation of why this temperature was assigned and what the next action should be.',
      },
      status: {
        type: 'string',
        enum: ['active', 'won', 'lost'],
        description: 'active = conversation ongoing; won = customer sent payment voucher/screenshot (ONLY then); lost = explicitly declined',
      },
      voucher_detected: {
        type: 'boolean',
        description: 'Set true ONLY when the customer message contains "[VOUCHER RECEIVED: ...]". Otherwise always false.',
      },
    },
    required: ['message', 'temperature', 'close_reason', 'status', 'voucher_detected'],
  },
}

// ─────────────────────────────────────────────
// MOCK MODE — used when ANTHROPIC_API_KEY is empty or "mock"
// ─────────────────────────────────────────────
const MOCK_POOL = {
  hot: [
    {
      message: '¡Me encanta! 😍 Es exactamente lo que buscaba. ¿Cómo puedo pagar? ¿Aceptan tarjeta de crédito o transferencia?',
      close_reason: 'Cliente pregunta directamente por métodos de pago — señal clara de compra inminente. Enviar link de pago ahora.',
    },
    {
      message: '¡Perfecto! 🔥 ¿Cuánto tarda el envío a Medellín? Quiero pedirlo hoy mismo.',
      close_reason: 'Urgencia explícita de compra hoy. Confirmar disponibilidad y tiempo de entrega para cerrar.',
    },
    {
      message: 'Me lo llevo ✅ ¿Cómo hago el pedido? Ya tengo el dinero listo.',
      close_reason: 'Decisión tomada, solo necesita instrucciones. Cerrar con link de pago inmediato.',
    },
    {
      message: '¡Qué hermoso! 💎 ¿Tienen el modelo en negro? Lo quiero para el sábado.',
      close_reason: 'Fecha límite específica (sábado) y color definido. Alta intención de compra, verificar stock.',
    },
  ],
  warm: [
    {
      message: 'Hmm suena bien... ¿Tienen fotos reales del producto? ¿Y tienen garantía si llega dañado? 🤔',
      close_reason: 'Interesada pero pide pruebas sociales y garantías. Enviar fotos reales y reforzar política de devolución.',
    },
    {
      message: 'Me gusta bastante pero el precio me parece un poco alto 😅 ¿Hacen descuentos o tienen cuotas?',
      close_reason: 'Objeción de precio. Ofrecer cuotas o promoción activa para superar el bloqueo.',
    },
    {
      message: '¿En qué colores lo tienen disponible? Estoy buscando un regalo para mi mamá 🎁',
      close_reason: 'Compra para regalo con intención real. Preguntar fecha de entrega necesaria y guiar a la elección.',
    },
    {
      message: 'Vi que tienen muchas reseñas buenas ✨ ¿Me pueden contar más sobre los materiales?',
      close_reason: 'Investigando antes de decidir. Responder con detalle técnico y testimonios para ganar confianza.',
    },
  ],
  cold: [
    {
      message: 'Ok, ya veo. Gracias por la info.',
      close_reason: 'Respuesta pasiva sin interés evidente. Re-enganchar con oferta concreta o pregunta directa.',
    },
    {
      message: 'Solo estaba mirando, gracias 😊',
      close_reason: 'Sin intención de compra inmediata. Dejar puerta abierta con catálogo y seguimiento en una semana.',
    },
    {
      message: 'Mmm no sé, lo pienso y te aviso 🤷',
      close_reason: 'Indecisión sin señales de avance. Crear urgencia con stock limitado o promoción por tiempo.',
    },
    {
      message: 'Qué bonito, pero ahorita no tengo presupuesto 💸',
      close_reason: 'Objeción económica clara. Registrar para seguimiento futuro y ofrecer lista de espera.',
    },
  ],
}

const MOCK_KEYWORDS = {
  hot: ['precio', 'costo', 'cuánto', 'cuanto', 'pagar', 'comprar', 'quiero', 'pedido', 'envío', 'envio', 'disponible', 'tarjeta', 'transferencia'],
  cold: ['no gracias', 'no me interesa', 'no tengo', 'muy caro', 'ok gracias', 'bye', 'adiós', 'adios'],
}

function getMockResponse(incomingMessage, imageUrl, config) {
  // If a voucher/image was sent → close as won immediately
  if (imageUrl) {
    return {
      message: '¡Perfecto! ✅ Recibimos tu comprobante de pago. Tu pedido está confirmado y en preparación. Te enviamos el número de seguimiento en cuanto salga. ¡Gracias por tu compra! 🎉',
      temperature: 'hot',
      close_reason: 'Comprobante de pago recibido. Venta cerrada exitosamente.',
      status: 'won',
      voucher_detected: true,
    }
  }

  const lower = incomingMessage.toLowerCase()

  // Keyword-biased temperature selection
  let temperature
  if (MOCK_KEYWORDS.hot.some((k) => lower.includes(k))) {
    temperature = Math.random() < 0.75 ? 'hot' : 'warm'
  } else if (MOCK_KEYWORDS.cold.some((k) => lower.includes(k))) {
    temperature = Math.random() < 0.75 ? 'cold' : 'warm'
  } else {
    // Weighted random: 25% hot, 45% warm, 30% cold
    const r = Math.random()
    temperature = r < 0.25 ? 'hot' : r < 0.70 ? 'warm' : 'cold'
  }

  const pool = MOCK_POOL[temperature]
  const pick = pool[Math.floor(Math.random() * pool.length)]

  return { message: pick.message, temperature, close_reason: pick.close_reason, status: 'active', voucher_detected: false }
}

// ─────────────────────────────────────────────
// MAIN WEBHOOK HANDLER
// POST /webhook/instagram/:companyId
//
// Expected payload from n8n:
// {
//   "instagram_username": "user_handle",
//   "instagram_user_id": "12345678",   // optional
//   "thread_id": "unique_thread_id",
//   "message": "Hello, I saw your post...", // optional if image_url present
//   "image_url": "https://..."             // optional — payment voucher/screenshot
// }
// ─────────────────────────────────────────────
app.post('/webhook/instagram/:companyId', async (req, res) => {
  const { companyId } = req.params

  // Optional webhook secret verification
  if (process.env.WEBHOOK_SECRET) {
    const secret = req.headers['x-webhook-secret'] || req.query.secret
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }
  }

  const {
    instagram_username,
    instagram_user_id,
    thread_id,
    message: rawMessage,
    image_url,
  } = req.body

  if (!instagram_username || !thread_id || (!rawMessage && !image_url)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: instagram_username, thread_id, and message or image_url',
    })
  }

  // Build the user message text — include voucher notice if an image was sent
  const message = image_url
    ? `${rawMessage ? rawMessage + '\n' : ''}[VOUCHER RECEIVED: ${image_url}]`
    : rawMessage

  console.log(`[${companyId}] New message from @${instagram_username}: "${message.slice(0, 80)}..."`)

  try {
    // 1. Load company configuration
    const config = loadConfig(companyId)

    // 2. Get or create the lead record
    const lead = await getOrCreateLead({
      companyId,
      instagramUsername: instagram_username,
      instagramUserId: instagram_user_id,
      threadId: thread_id,
    })

    // 3. Save the incoming user message
    await saveMessage(lead.id, 'user', message)

    // 4. Load full conversation history
    const history = await getMessages(lead.id)

    // Build Claude messages array (all history including the just-saved user message)
    const claudeMessages = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }))

    // 5. Get AI response — real Claude or mock
    const useMock = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'mock'
    let aiMessage, temperature, close_reason, status, voucher_detected

    if (useMock) {
      // ── MOCK MODE ──────────────────────────────
      console.log(`[${companyId}] ⚠️  MOCK MODE (ANTHROPIC_API_KEY not set)`)
      ;({ message: aiMessage, temperature, close_reason, status, voucher_detected } =
        getMockResponse(message, image_url, config))
    } else {
      // ── REAL CLAUDE ────────────────────────────
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: buildSystemPrompt(config),
        tools: [SALES_RESPONSE_TOOL],
        tool_choice: { type: 'tool', name: 'sales_response' },
        messages: claudeMessages,
      })

      const toolUseBlock = claudeResponse.content.find((b) => b.type === 'tool_use')
      if (!toolUseBlock) {
        throw new Error('Claude did not invoke the sales_response tool')
      }
      ;({ message: aiMessage, temperature, close_reason, status, voucher_detected } = toolUseBlock.input)
    }

    // 6. Save the AI response
    await saveMessage(lead.id, 'assistant', aiMessage)

    // 7. Update lead — attach voucher_url only when a voucher was confirmed
    const leadUpdates = {
      temperature,
      close_reason,
      status,
      message_count: history.length + 1,
    }
    if (voucher_detected && image_url) {
      leadUpdates.voucher_url = image_url
      leadUpdates.status = 'won' // enforce won when voucher confirmed
    }

    await updateLead(lead.id, leadUpdates)

    console.log(`[${companyId}] @${instagram_username} → ${temperature.toUpperCase()} / ${leadUpdates.status}${voucher_detected ? ' 🏆 VOUCHER' : ''} — "${aiMessage.slice(0, 50)}..."`)

    return res.json({
      success: true,
      response: aiMessage,
      lead: {
        id: lead.id,
        temperature,
        status: leadUpdates.status,
        close_reason,
        voucher_detected: !!voucher_detected,
      },
    })
  } catch (err) {
    console.error(`[${companyId}] Error:`, err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────────
// REST API FOR DASHBOARD
// ─────────────────────────────────────────────

// List available companies
app.get('/api/companies', (req, res) => {
  try {
    const configDir = join(__dirname, 'configs')
    const files = readdirSync(configDir).filter((f) => f.endsWith('.json'))
    const companies = files.map((f) => {
      const cfg = JSON.parse(readFileSync(join(configDir, f), 'utf8'))
      return {
        id: f.replace('.json', ''),
        name: cfg.company_name,
        agent_name: cfg.agent_name,
      }
    })
    res.json(companies)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  const mockMode = !process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'mock'
  console.log(`\n🤖 Instagram Sales Agent`)
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook/instagram/:companyId`)
  console.log(`   API:     GET  http://localhost:${PORT}/api/companies`)
  console.log(`   Mode:    ${mockMode ? '⚠️  MOCK (ANTHROPIC_API_KEY not set)' : '✅  Claude claude-opus-4-6'}`)
  console.log(`   Ready.\n`)
})
