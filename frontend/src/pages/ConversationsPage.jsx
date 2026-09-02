import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Phone, Loader2 } from 'lucide-react';
import { api } from '../api/client';

const CHANNEL_LABELS = { whatsapp: 'WhatsApp', messenger: 'Messenger', instagram: 'Instagram' };
const CHANNEL_COLORS = {
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  messenger: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(dateStr).toLocaleDateString('es-PE');
}

export default function ConversationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.conversations.list();
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  return (
    <div className="flex h-full -m-4 lg:-m-6 bg-white dark:bg-gray-800">
      <div className={`w-full sm:w-80 border-r border-gray-200 dark:border-gray-700 flex-col ${id ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Conversaciones</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4 text-sm text-gray-500 dark:text-gray-400">
              Todavía no hay ninguna conversación.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/conversaciones/${c.id}`)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${String(id) === String(c.id) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{c.display_name || c.phone || c.external_contact_id}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CHANNEL_COLORS[c.channel] || 'bg-gray-100 text-gray-600'}`}>
                    {CHANNEL_LABELS[c.channel] || c.channel}
                  </span>
                  {c.last_message && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {c.last_message.direction === 'outbound' ? 'Vos: ' : ''}{c.last_message.body_text}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex-col ${id ? 'flex' : 'hidden sm:flex'}`}>
        {id ? (
          <ConversationThread conversationId={id} onBack={() => navigate('/conversaciones')} conversations={conversations} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Elegí una conversación para ver los mensajes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationThread({ conversationId, onBack, conversations }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const meta = conversations.find((c) => String(c.id) === String(conversationId));

  const load = useCallback(async () => {
    try {
      const data = await api.conversations.getMessages(conversationId);
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.conversations.sendMessage(conversationId, text.trim());
      setText('');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <button onClick={onBack} className="sm:hidden text-primary-600 text-sm font-medium">← Volver</button>
        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
          <Phone className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{meta?.display_name || meta?.phone || 'Conversación'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{CHANNEL_LABELS[meta?.channel] || meta?.channel}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.direction === 'outbound'
                  ? m.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
              }`}>
                <p className="whitespace-pre-wrap">{m.body_text}</p>
                <p className={`text-[10px] mt-1 ${m.direction === 'outbound' ? (m.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-primary-100') : 'text-gray-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  {m.status === 'failed' && ' · no se pudo enviar'}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribir una respuesta..."
          className="input-field flex-1"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-4 flex items-center justify-center">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </>
  );
}
