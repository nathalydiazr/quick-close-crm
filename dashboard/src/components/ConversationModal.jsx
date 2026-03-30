import { useEffect, useState, useRef } from 'react'
import { X, MessageCircle, Instagram, Thermometer, Clock, Bot, User } from 'lucide-react'
import { fetchMessages } from '../lib/supabase'
import { format } from 'date-fns'

const TEMP_LABELS = {
  hot: { label: 'Hot', color: 'text-red-600 bg-red-50 border-red-200', emoji: '🔥' },
  warm: { label: 'Warm', color: 'text-amber-600 bg-amber-50 border-amber-200', emoji: '🌡️' },
  cold: { label: 'Cold', color: 'text-blue-600 bg-blue-50 border-blue-200', emoji: '❄️' },
}

const STATUS_COLORS = {
  active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  won: 'text-violet-600 bg-violet-50 border-violet-200',
  lost: 'text-slate-500 bg-slate-50 border-slate-200',
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  const time = format(new Date(message.created_at), 'HH:mm')

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-start' : 'justify-end'}`}>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0 mb-1">
          <User size={12} className="text-white" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? '' : 'items-end'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-slate-100 text-slate-800 rounded-bl-sm'
              : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm shadow-sm'
          }`}
        >
          {message.content}
        </div>
        <span className="text-xs text-slate-400 px-1">{time}</span>
      </div>

      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mb-1">
          <Bot size={12} className="text-white" />
        </div>
      )}
    </div>
  )
}

export default function ConversationModal({ lead, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const temp = TEMP_LABELS[lead.temperature] || TEMP_LABELS.cold

  useEffect(() => {
    fetchMessages(lead.id)
      .then((data) => {
        setMessages(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load messages:', err)
        setLoading(false)
      })
  }, [lead.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close on backdrop click or Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Instagram size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-base">@{lead.instagram_username}</p>
                <p className="text-violet-200 text-xs">{lead.company_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lead info row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`badge border ${temp.color}`}>
              {temp.emoji} {temp.label}
            </span>
            <span className={`badge border ${STATUS_COLORS[lead.status] || STATUS_COLORS.active}`}>
              {lead.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-violet-200">
              <MessageCircle size={11} />
              {lead.message_count || 0} messages
            </span>
          </div>

          {/* Close reason */}
          {lead.close_reason && (
            <div className="mt-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-violet-100 flex items-start gap-1.5">
              <Thermometer size={11} className="mt-0.5 shrink-0" />
              <span>{lead.close_reason}</span>
            </div>
          )}
        </div>

        {/* Conversation body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className={`h-10 rounded-2xl animate-pulse bg-slate-200 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
              <MessageCircle size={32} className="mb-2 opacity-30" />
              <p>No messages yet</p>
            </div>
          ) : (
            <>
              {/* Date separator */}
              {messages[0] && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(messages[0].created_at), 'MMM d, yyyy')}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Conversation managed by <strong className="text-slate-600">Claude AI</strong>
          </p>
          <p className="text-xs text-slate-400">
            Created {lead.created_at ? format(new Date(lead.created_at), 'MMM d') : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
