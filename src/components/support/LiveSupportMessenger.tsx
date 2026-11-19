import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X, CheckCheck, Plus } from 'lucide-react';
import { apiRequest, getAuthToken } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { safeErrorMessage } from '../../lib/safeErrorMessage';

export interface SupportThreadItem {
  id: string;
  userId?: string;
  visitorName: string;
  visitorEmail: string;
  topic: string;
  status: 'open' | 'pending' | 'resolved';
  unreadAdminCount: number;
  unreadVisitorCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessageItem {
  id: string;
  threadId: string;
  senderType: 'visitor' | 'investor' | 'staff';
  senderName: string;
  senderId?: string;
  body: string;
  createdAt: string;
}

const SUPPORT_TOPICS = [
  'Portfolio & SPV Dossiers',
  'Deposits & SEPA Transfers',
  'Withdrawals & Payouts',
  'KYC & Compliance Verification',
  'Tax Statements & Reporting',
  'General Inquiry',
];

const SUPPORT_STORAGE_KEY = 'lagence_support_thread_v1';

interface StoredSupportCredentials {
  threadId: string;
  visitorToken: string;
  userId?: string;
}

function readStoredSupportCreds(): StoredSupportCredentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SUPPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.threadId && parsed?.visitorToken) {
      return {
        threadId: String(parsed.threadId),
        visitorToken: String(parsed.visitorToken),
        userId: parsed.userId ? String(parsed.userId) : undefined,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function saveStoredSupportCreds(creds: StoredSupportCredentials | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!creds) {
      window.localStorage.removeItem(SUPPORT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(creds));
    }
  } catch {
    // Ignore storage write errors
  }
}

export function useLiveSupportSession(active = true) {
  const { user } = useAuth();
  const [thread, setThread] = useState<SupportThreadItem | null>(null);
  const [messages, setMessages] = useState<SupportMessageItem[]>([]);
  const [visitorToken, setVisitorToken] = useState<string | null>(() => readStoredSupportCreds()?.visitorToken || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const threadId = thread?.id || null;

  const hydrateCurrentThread = useCallback(async () => {
    const stored = readStoredSupportCreds();
    // If logged in as a different user than the stored guest/investor thread, ignore mismatched stored creds
    const useStored =
      stored && (!user?.id || !stored.userId || stored.userId === user.id) ? stored : null;
    if (!useStored && !user?.id) return;

    setLoading((prev) => prev || !thread);
    try {
      const res: any = await apiRequest('/support/threads/current', {
        params: useStored
          ? { threadId: useStored.threadId, visitorToken: useStored.visitorToken }
          : undefined,
      });
      const data = res?.data;
      if (data?.thread?.id) {
        setThread(data.thread);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        const tok = data.visitorToken || useStored?.visitorToken || '';
        setVisitorToken(tok || null);
        saveStoredSupportCreds({
          threadId: data.thread.id,
          visitorToken: tok,
          userId: data.thread.userId || user?.id,
        });
      } else if (useStored && !user?.id) {
        saveStoredSupportCreds(null);
        setThread(null);
        setMessages([]);
        setVisitorToken(null);
      }
    } catch {
      // Preserve UI cleanly when server is unreachable temporarily
    } finally {
      setLoading(false);
    }
  }, [user?.id, thread]);

  useEffect(() => {
    if (!active) return;
    void hydrateCurrentThread();
  }, [active, user?.id]);

  // Connect WebSocket for the active support thread + fallback 15s polling
  useEffect(() => {
    if (!active || !threadId || typeof window === 'undefined') return;
    const tok = visitorToken || readStoredSupportCreds()?.visitorToken || '';
    const authToken = getAuthToken() || '';
    if (!tok && !authToken) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const qs = new URLSearchParams({ threadId });
      if (tok) qs.set('visitorToken', tok);
      if (authToken) qs.set('token', authToken);
      try {
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/support?${qs.toString()}`);
      } catch {
        setWsConnected(false);
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data));
          if (payload?.type === 'thread:sync') {
            if (payload.thread) setThread(payload.thread);
            if (Array.isArray(payload.messages)) setMessages(payload.messages);
          } else if (payload?.type === 'thread:updated' && payload.thread) {
            setThread(payload.thread);
          } else if (payload?.type === 'message:created' && payload.message) {
            if (payload.thread) setThread(payload.thread);
            setMessages((prev) =>
              prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
            );
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closed) {
          const delay = Math.min(15_000, 1500 * Math.pow(1.6, attempt));
          attempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    };

    connect();
    const poll = window.setInterval(async () => {
      try {
        const res: any = await apiRequest(`/support/threads/${encodeURIComponent(threadId)}/messages`, {
          params: tok ? { visitorToken: tok } : undefined,
        });
        if (res?.data?.thread) setThread(res.data.thread);
        if (Array.isArray(res?.data?.messages)) setMessages(res.data.messages);
      } catch {
        // Silent background poll
      }
    }, 15_000);

    return () => {
      closed = true;
      window.clearInterval(poll);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {}
    };
  }, [active, threadId, visitorToken]);

  const startConversation = useCallback(
    async (params: { name: string; email: string; topic: string; initialMessage?: string }) => {
      setError(null);
      setSending(true);
      try {
        const res: any = await apiRequest('/support/threads', {
          method: 'POST',
          body: {
            name: params.name.trim(),
            email: params.email.trim(),
            topic: params.topic,
            initialMessage: params.initialMessage?.trim() || '',
          },
        });
        const data = res?.data;
        if (!data?.thread?.id) {
          throw new Error('Could not start support conversation.');
        }
        setThread(data.thread);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        const tok = data.visitorToken || '';
        setVisitorToken(tok || null);
        saveStoredSupportCreds({
          threadId: data.thread.id,
          visitorToken: tok,
          userId: data.thread.userId || user?.id,
        });
        return data.thread as SupportThreadItem;
      } catch (err: any) {
        const msg = safeErrorMessage(err, 'Unable to start live support chat.');
        setError(msg);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [user?.id]
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!thread?.id || !body.trim()) return;
      setError(null);
      setSending(true);
      try {
        const tok = visitorToken || readStoredSupportCreds()?.visitorToken || '';
        const res: any = await apiRequest(`/support/threads/${encodeURIComponent(thread.id)}/messages`, {
          method: 'POST',
          body: {
            body: body.trim(),
            visitorToken: tok || undefined,
            senderName: user?.fullName || thread.visitorName,
          },
        });
        const savedMsg = res?.data?.message;
        const savedThread = res?.data?.thread;
        if (savedThread) setThread(savedThread);
        if (savedMsg) {
          setMessages((prev) => (prev.some((m) => m.id === savedMsg.id) ? prev : [...prev, savedMsg]));
        }
      } catch (err: any) {
        setError(safeErrorMessage(err, 'Unable to send message right now.'));
      } finally {
        setSending(false);
      }
    },
    [thread, visitorToken, user?.fullName]
  );

  const resetConversation = useCallback(() => {
    saveStoredSupportCreds(null);
    setThread(null);
    setMessages([]);
    setVisitorToken(null);
    setError(null);
  }, []);

  return {
    thread,
    messages,
    loading,
    sending,
    wsConnected,
    error,
    setError,
    startConversation,
    sendMessage,
    resetConversation,
  };
}

interface LiveSupportPanelProps {
  compact?: boolean;
  onClose?: () => void;
}

export const LiveSupportConversationPanel: React.FC<LiveSupportPanelProps> = ({
  compact = false,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    thread,
    messages,
    loading,
    sending,
    wsConnected,
    error,
    setError,
    startConversation,
    sendMessage,
    resetConversation,
  } = useLiveSupportSession(true);

  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0]);
  const [initialMessage, setInitialMessage] = useState('');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user?.fullName && !name) setName(user.fullName);
    if (user?.email && !email) setEmail(user.email);
  }, [user?.fullName, user?.email, name, email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, thread?.id]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (name || user?.fullName || '').trim();
    const cleanEmail = (email || user?.email || '').trim();
    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter your name and a valid email address.');
      return;
    }
    try {
      await startConversation({
        name: cleanName,
        email: cleanEmail,
        topic,
        initialMessage,
      });
      setInitialMessage('');
    } catch {
      // Handled inside hook
    }
  };

  const handleSendDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F10] text-[#F2F5F4]">
      {/* Header */}
      <div className="px-4 py-3.5 bg-[#121A1F] border-b border-[#1F2C33] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#6FD8B0]/15 border border-[#6FD8B0]/35 text-[#6FD8B0] flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#F2F5F4] truncate">
              L&apos;Agence Live Support
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8FA1A8]">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected || !thread ? 'bg-[#6FD8B0]' : 'bg-amber-400'}`} />
              <span>
                {thread
                  ? thread.status === 'resolved'
                    ? 'Conversation resolved'
                    : wsConnected
                    ? 'Connected · Live advisor desk'
                    : 'Synced · Investor Relations'
                  : 'Direct Investor Relations Desk'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {thread && (
            <button
              type="button"
              onClick={resetConversation}
              title="Start new conversation"
              className="min-h-[36px] px-2.5 rounded-lg border border-[#1F2C33] text-[11px] font-semibold text-[#B6C4C9] hover:text-[#F2F5F4] hover:border-[#6FD8B0] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close live support chat"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-3 mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading && !thread ? (
        <div className="flex-1 flex items-center justify-center p-6 text-xs text-[#8FA1A8]">
          Connecting to live support desk...
        </div>
      ) : !thread ? (
        <form onSubmit={handleStart} className={`flex-1 overflow-y-auto p-4 space-y-3.5 ${compact ? 'text-xs' : 'text-sm'}`}>
          <div className="p-3 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-xs text-[#B6C4C9] leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#6FD8B0] shrink-0 mt-0.5" />
            <span>
              Start a real-time conversation with our Investor Relations team regarding deposits, SPV holdings, or KYC verification.
            </span>
          </div>

          {!user?.id && (
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="live-support-name" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Your name
                </label>
                <input
                  id="live-support-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Claire Laurent"
                  className="min-h-[42px] w-full px-3 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                />
              </div>
              <div>
                <label htmlFor="live-support-email" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
                  Email address
                </label>
                <input
                  id="live-support-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="claire@domain.com"
                  className="min-h-[42px] w-full px-3 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="live-support-topic" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
              Topic
            </label>
            <select
              id="live-support-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[42px] w-full px-3 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            >
              {SUPPORT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="live-support-first-msg" className="block text-xs font-semibold text-[#B6C4C9] mb-1">
              Message
            </label>
            <textarea
              id="live-support-first-msg"
              rows={compact ? 3 : 4}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Write your question here..."
              className="w-full p-3 bg-[#121A1F] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="min-h-[44px] w-full rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Starting live chat...' : 'Start live chat'}</span>
          </button>
        </form>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {messages.map((m) => {
              const isSelf = m.senderType !== 'staff';
              return (
                <div key={m.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-[#8FA1A8] mb-1 px-1">
                    {m.senderName}
                  </span>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      isSelf
                        ? 'bg-[#6FD8B0] text-[#0B0F10] font-medium'
                        : 'bg-[#121A1F] border border-[#1F2C33] text-[#F2F5F4]'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}
            {thread.status === 'resolved' && (
              <div className="p-2.5 rounded-xl bg-[#121A1F] border border-[#6FD8B0]/30 text-[11px] text-[#6FD8B0] flex items-center justify-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marked as resolved · Reply below to reopen anytime</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSendDraft} className="p-3 bg-[#121A1F] border-t border-[#1F2C33] flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message..."
              aria-label="Write a support message"
              className="min-h-[42px] flex-1 px-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send support message"
              className="min-h-[42px] min-w-[42px] px-3 rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export const LiveSupportMessenger: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const handleOpenEvent = () => {
      setOpen(true);
      setHasUnread(false);
    };
    window.addEventListener('kretz:open-support', handleOpenEvent);
    return () => {
      window.removeEventListener('kretz:open-support', handleOpenEvent);
    };
  }, []);

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="Live support messenger"
          className="fixed right-4 bottom-20 lg:bottom-5 z-[80] w-[calc(100vw-2rem)] max-w-sm h-[500px] max-h-[calc(100vh-6.5rem)] rounded-2xl border border-[#1F2C33] shadow-2xl overflow-hidden"
        >
          <LiveSupportConversationPanel compact onClose={() => setOpen(false)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setHasUnread(false);
          }}
          aria-label="Open live support chat"
          className="fixed right-4 bottom-20 lg:bottom-5 z-[75] min-h-[48px] px-4 py-2.5 rounded-full bg-[#121A1F] border border-[#6FD8B0]/55 text-[#F2F5F4] shadow-xl hover:border-[#6FD8B0] hover:bg-[#172228] transition-all inline-flex items-center gap-2.5 cursor-pointer"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6FD8B0] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6FD8B0]" />
          </span>
          <MessageCircle className="w-4 h-4 text-[#6FD8B0]" />
          <span className="text-xs font-semibold tracking-tight">Live Support</span>
          {hasUnread && (
            <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true" />
          )}
        </button>
      )}
    </>
  );
};
