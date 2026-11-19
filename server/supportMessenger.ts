import crypto from 'crypto';
import type http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getSession } from './authService';
import { verifyAdminSessionToken } from './adminAuth';
import { verifyPersistentAdminSession } from './persistentAdminAuth';
import {
  canUseLiveSupabaseData,
  createUserNotification,
  getSupabaseAdmin,
  getAdminIdentityByEmail,
  isMissingSchemaError,
  verifySupabaseAccessToken,
} from './supabaseDatabase';

export type SupportThreadStatus = 'open' | 'pending' | 'resolved';
export type SupportSenderType = 'visitor' | 'investor' | 'staff';

export interface SupportMessageRecord {
  id: string;
  threadId: string;
  senderType: SupportSenderType;
  senderName: string;
  senderId?: string;
  body: string;
  createdAt: string;
}

export interface SupportThreadRecord {
  id: string;
  userId?: string;
  visitorName: string;
  visitorEmail: string;
  topic: string;
  status: SupportThreadStatus;
  unreadAdminCount: number;
  unreadVisitorCount: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredThreadBundle {
  thread: SupportThreadRecord;
  visitorToken: string;
  messages: SupportMessageRecord[];
}

const ADMIN_STAFF_ROLES = new Set([
  'admin',
  'super_admin',
  'finance_admin',
  'operations_admin',
  'finance',
  'compliance',
  'property_manager',
  'support',
  'auditor',
]);

const threadsMap = new Map<string, StoredThreadBundle>();
let hydrated = false;
let supabaseSupportSchemaAvailable = true;

async function getStorePath(): Promise<string> {
  const osMod = await import(/* @vite-ignore */ 'node:' + 'os');
  const pathMod = await import(/* @vite-ignore */ 'node:' + 'path');
  return pathMod.join(osMod.tmpdir(), 'lagence-support-messenger.json');
}

export async function ensureSupportStoreHydrated(): Promise<void> {
  if (hydrated || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    hydrated = true;
    return;
  }
  hydrated = true;
  try {
    const fsMod = await import(/* @vite-ignore */ 'node:' + 'fs/promises');
    const filePath = await getStorePath();
    const raw = await fsMod.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item?.thread?.id && item?.visitorToken && Array.isArray(item?.messages)) {
          threadsMap.set(String(item.thread.id), item);
        }
      }
    }
  } catch {
    // No persisted snapshot yet
  }
}

async function persistSupportStore(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return;
  try {
    const fsMod = await import(/* @vite-ignore */ 'node:' + 'fs/promises');
    const filePath = await getStorePath();
    const payload = Array.from(threadsMap.values()).slice(-200);
    await fsMod.writeFile(filePath, JSON.stringify(payload), 'utf8');
  } catch {
    // Non-fatal in ephemeral environments
  }
}

async function persistThreadToSupabase(bundle: StoredThreadBundle): Promise<void> {
  if (!canUseLiveSupabaseData() || !supabaseSupportSchemaAvailable) return;
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('support_conversations').upsert(
      {
        id: bundle.thread.id,
        user_id: bundle.thread.userId || null,
        visitor_name: bundle.thread.visitorName,
        visitor_email: bundle.thread.visitorEmail,
        topic: bundle.thread.topic,
        status: bundle.thread.status,
        visitor_token: bundle.visitorToken,
        unread_admin_count: bundle.thread.unreadAdminCount,
        unread_visitor_count: bundle.thread.unreadVisitorCount,
        last_message_at: bundle.thread.lastMessageAt,
        last_message_preview: bundle.thread.lastMessagePreview,
        created_at: bundle.thread.createdAt,
        updated_at: bundle.thread.updatedAt,
      },
      { onConflict: 'id' }
    );
    if (error && isMissingSchemaError(error)) {
      supabaseSupportSchemaAvailable = false;
    }
  } catch {
    // Best-effort sync
  }
}

async function persistMessageToSupabase(msg: SupportMessageRecord): Promise<void> {
  if (!canUseLiveSupabaseData() || !supabaseSupportSchemaAvailable) return;
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('support_messages').upsert(
      {
        id: msg.id,
        thread_id: msg.threadId,
        sender_type: msg.senderType,
        sender_name: msg.senderName,
        sender_id: msg.senderId || null,
        body: msg.body,
        created_at: msg.createdAt,
      },
      { onConflict: 'id' }
    );
    if (error && isMissingSchemaError(error)) {
      supabaseSupportSchemaAvailable = false;
    }
  } catch {
    // Best-effort sync
  }
}

async function hydrateFromSupabaseIfAvailable(): Promise<void> {
  if (!canUseLiveSupabaseData() || !supabaseSupportSchemaAvailable) return;
  try {
    const admin = getSupabaseAdmin();
    const { data: convRows, error: convErr } = await admin
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200);
    if (convErr) {
      if (isMissingSchemaError(convErr)) supabaseSupportSchemaAvailable = false;
      return;
    }
    if (!Array.isArray(convRows) || convRows.length === 0) return;

    const threadIds = convRows.map((c: any) => String(c.id));
    const { data: msgRows } = await admin
      .from('support_messages')
      .select('*')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });

    const msgsByThread = new Map<string, SupportMessageRecord[]>();
    for (const m of msgRows || []) {
      const tid = String((m as any).thread_id);
      const list = msgsByThread.get(tid) || [];
      list.push({
        id: String((m as any).id),
        threadId: tid,
        senderType: ((m as any).sender_type || 'visitor') as SupportSenderType,
        senderName: String((m as any).sender_name || 'Guest'),
        senderId: (m as any).sender_id ? String((m as any).sender_id) : undefined,
        body: String((m as any).body || ''),
        createdAt: String((m as any).created_at || new Date().toISOString()),
      });
      msgsByThread.set(tid, list);
    }

    for (const c of convRows as any[]) {
      const tid = String(c.id);
      if (threadsMap.has(tid)) continue;
      threadsMap.set(tid, {
        thread: {
          id: tid,
          userId: c.user_id ? String(c.user_id) : undefined,
          visitorName: String(c.visitor_name || 'Guest Investor'),
          visitorEmail: String(c.visitor_email || ''),
          topic: String(c.topic || 'General Inquiry'),
          status: (c.status || 'open') as SupportThreadStatus,
          unreadAdminCount: Number(c.unread_admin_count || 0),
          unreadVisitorCount: Number(c.unread_visitor_count || 0),
          lastMessageAt: String(c.last_message_at || c.created_at || new Date().toISOString()),
          lastMessagePreview: String(c.last_message_preview || ''),
          createdAt: String(c.created_at || new Date().toISOString()),
          updatedAt: String(c.updated_at || c.last_message_at || new Date().toISOString()),
        },
        visitorToken: String(c.visitor_token || crypto.randomBytes(24).toString('hex')),
        messages: msgsByThread.get(tid) || [],
      });
    }
  } catch {
    // Fallback to in-memory/snapshot
  }
}

// Connected WebSocket clients partitioned by room
const threadSockets = new Map<string, Set<WebSocket>>();
const adminSockets = new Set<WebSocket>();

function safeSendWs(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Ignore transient socket close
    }
  }
}

function broadcastEvent(threadId: string, payload: unknown): void {
  const room = threadSockets.get(threadId);
  if (room) {
    for (const ws of room) {
      safeSendWs(ws, payload);
    }
  }
  for (const ws of adminSockets) {
    safeSendWs(ws, payload);
  }
}

export function findThreadBundleById(threadId: string): StoredThreadBundle | undefined {
  return threadsMap.get(String(threadId || '').trim());
}

export function findThreadByUserId(userId: string): StoredThreadBundle | undefined {
  if (!userId) return undefined;
  let best: StoredThreadBundle | undefined;
  for (const bundle of threadsMap.values()) {
    if (bundle.thread.userId === userId) {
      if (!best || new Date(bundle.thread.lastMessageAt).getTime() > new Date(best.thread.lastMessageAt).getTime()) {
        best = bundle;
      }
    }
  }
  return best;
}

export function verifyThreadAccess(
  bundle: StoredThreadBundle,
  opts: { visitorToken?: string | null; userId?: string | null; isStaff?: boolean }
): boolean {
  if (opts.isStaff) return true;
  if (opts.userId && bundle.thread.userId && opts.userId === bundle.thread.userId) return true;
  if (opts.visitorToken && opts.visitorToken.trim() === bundle.visitorToken) return true;
  return false;
}

export async function createOrResumeSupportThread(params: {
  userId?: string;
  visitorName: string;
  visitorEmail: string;
  topic?: string;
  initialMessage?: string;
}): Promise<{ thread: SupportThreadRecord; messages: SupportMessageRecord[]; visitorToken: string }> {
  await ensureSupportStoreHydrated();
  await hydrateFromSupabaseIfAvailable();

  const cleanEmail = String(params.visitorEmail || '').trim().toLowerCase();
  const cleanName = String(params.visitorName || '').trim() || cleanEmail.split('@')[0] || 'Investor';
  const cleanTopic = String(params.topic || '').trim() || 'Investor Relations Live Desk';

  if (params.userId) {
    const existing = findThreadByUserId(params.userId);
    if (existing && existing.thread.status !== 'resolved') {
      if (params.initialMessage && params.initialMessage.trim()) {
        await appendSupportMessage({
          threadId: existing.thread.id,
          senderType: 'investor',
          senderName: existing.thread.visitorName || cleanName,
          senderId: params.userId,
          body: params.initialMessage.trim(),
        });
      }
      return {
        thread: existing.thread,
        messages: existing.messages,
        visitorToken: existing.visitorToken,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const threadId = `sup-${crypto.randomUUID()}`;
  const visitorToken = crypto.randomBytes(24).toString('hex');
  const welcomeMsg: SupportMessageRecord = {
    id: `smsg-${crypto.randomUUID()}`,
    threadId,
    senderType: 'staff',
    senderName: 'Investor Relations Desk',
    body: `Bonjour ${cleanName}, welcome to L’Agence Investor Relations Live Messenger. Send your question below and an advisor will reply directly here.`,
    createdAt: nowIso,
  };

  const initialMessages: SupportMessageRecord[] = [welcomeMsg];
  let preview = welcomeMsg.body;
  let lastAt = nowIso;
  let unreadAdminCount = 0;

  if (params.initialMessage && params.initialMessage.trim()) {
    const firstUserMsg: SupportMessageRecord = {
      id: `smsg-${crypto.randomUUID()}`,
      threadId,
      senderType: params.userId ? 'investor' : 'visitor',
      senderName: cleanName,
      senderId: params.userId,
      body: params.initialMessage.trim(),
      createdAt: new Date(Date.now() + 5).toISOString(),
    };
    initialMessages.push(firstUserMsg);
    preview = firstUserMsg.body.slice(0, 140);
    lastAt = firstUserMsg.createdAt;
    unreadAdminCount = 1;
  }

  const bundle: StoredThreadBundle = {
    thread: {
      id: threadId,
      userId: params.userId,
      visitorName: cleanName,
      visitorEmail: cleanEmail,
      topic: cleanTopic,
      status: 'open',
      unreadAdminCount,
      unreadVisitorCount: 0,
      lastMessageAt: lastAt,
      lastMessagePreview: preview,
      createdAt: nowIso,
      updatedAt: lastAt,
    },
    visitorToken,
    messages: initialMessages,
  };

  threadsMap.set(threadId, bundle);
  await persistSupportStore();
  await persistThreadToSupabase(bundle);
  for (const m of initialMessages) {
    await persistMessageToSupabase(m);
  }

  broadcastEvent(threadId, {
    type: 'thread:created',
    thread: bundle.thread,
    messages: bundle.messages,
  });

  return {
    thread: bundle.thread,
    messages: bundle.messages,
    visitorToken,
  };
}

export async function appendSupportMessage(params: {
  threadId: string;
  senderType: SupportSenderType;
  senderName: string;
  senderId?: string;
  body: string;
}): Promise<{ thread: SupportThreadRecord; message: SupportMessageRecord } | null> {
  await ensureSupportStoreHydrated();
  await hydrateFromSupabaseIfAvailable();

  const bundle = threadsMap.get(params.threadId);
  if (!bundle) return null;

  const cleanBody = String(params.body || '').trim();
  if (!cleanBody) {
    throw new Error('Message body is required.');
  }

  const nowIso = new Date().toISOString();
  const message: SupportMessageRecord = {
    id: `smsg-${crypto.randomUUID()}`,
    threadId: bundle.thread.id,
    senderType: params.senderType,
    senderName: String(params.senderName || (params.senderType === 'staff' ? 'Investor Support Advisor' : bundle.thread.visitorName)).trim(),
    senderId: params.senderId,
    body: cleanBody.slice(0, 4000),
    createdAt: nowIso,
  };

  bundle.messages.push(message);
  if (bundle.messages.length > 500) {
    bundle.messages = bundle.messages.slice(-500);
  }

  bundle.thread.lastMessageAt = nowIso;
  bundle.thread.updatedAt = nowIso;
  bundle.thread.lastMessagePreview = message.body.slice(0, 140);
  if (params.senderType === 'staff') {
    bundle.thread.unreadVisitorCount += 1;
    bundle.thread.unreadAdminCount = 0;
    if (bundle.thread.status === 'resolved') {
      bundle.thread.status = 'open';
    }
  } else {
    bundle.thread.unreadAdminCount += 1;
    bundle.thread.unreadVisitorCount = 0;
    if (bundle.thread.status === 'resolved') {
      bundle.thread.status = 'open';
    }
  }

  await persistSupportStore();
  await persistThreadToSupabase(bundle);
  await persistMessageToSupabase(message);

  // If staff replied to a registered investor, also push an in-app alert so they notice in the portal bell
  if (params.senderType === 'staff' && bundle.thread.userId && canUseLiveSupabaseData()) {
    await createUserNotification(bundle.thread.userId, {
      title: 'New reply from Investor Relations',
      message: message.body.slice(0, 160),
      type: 'info',
    }).catch(() => {});
  }

  broadcastEvent(bundle.thread.id, {
    type: 'message:created',
    threadId: bundle.thread.id,
    thread: bundle.thread,
    message,
  });

  return { thread: bundle.thread, message };
}

export async function listAdminSupportThreads(): Promise<Array<SupportThreadRecord & { messagesCount: number }>> {
  await ensureSupportStoreHydrated();
  await hydrateFromSupabaseIfAvailable();
  return Array.from(threadsMap.values())
    .map((b) => ({
      ...b.thread,
      messagesCount: b.messages.length,
    }))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function updateSupportThreadStatus(
  threadId: string,
  status: SupportThreadStatus
): Promise<SupportThreadRecord | null> {
  await ensureSupportStoreHydrated();
  const bundle = threadsMap.get(threadId);
  if (!bundle) return null;
  bundle.thread.status = status;
  bundle.thread.updatedAt = new Date().toISOString();
  await persistSupportStore();
  await persistThreadToSupabase(bundle);
  broadcastEvent(threadId, {
    type: 'thread:updated',
    threadId,
    thread: bundle.thread,
  });
  return bundle.thread;
}

export async function markSupportThreadReadByAdmin(threadId: string): Promise<SupportThreadRecord | null> {
  await ensureSupportStoreHydrated();
  const bundle = threadsMap.get(threadId);
  if (!bundle) return null;
  bundle.thread.unreadAdminCount = 0;
  bundle.thread.updatedAt = new Date().toISOString();
  await persistSupportStore();
  await persistThreadToSupabase(bundle);
  broadcastEvent(threadId, {
    type: 'thread:updated',
    threadId,
    thread: bundle.thread,
  });
  return bundle.thread;
}

async function resolveWsIdentity(token: string): Promise<{ userId: string; role: string; email: string; fullName: string } | null> {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;

  if (process.env.NODE_ENV === 'test' && cleanToken.startsWith('admin_sess_')) {
    return {
      userId: cleanToken.replace('admin_sess_', '') || 'usr-admin-01',
      role: 'super_admin',
      email: 'admin@kretz.com',
      fullName: 'Executive Administrator',
    };
  }

  if (cleanToken.startsWith('kretz_adm_')) {
    const persistentAdmin = await verifyPersistentAdminSession(cleanToken).catch(() => null);
    if (persistentAdmin) {
      if (canUseLiveSupabaseData()) {
        const dbIdentity = await getAdminIdentityByEmail(persistentAdmin.email).catch(() => null);
        if (dbIdentity) {
          return {
            userId: dbIdentity.id,
            role: dbIdentity.staffRole || dbIdentity.role,
            email: dbIdentity.email,
            fullName: dbIdentity.fullName || 'Administrator',
          };
        }
      }
      return {
        userId: persistentAdmin.sub || 'usr-admin-01',
        role: 'super_admin',
        email: persistentAdmin.email,
        fullName: persistentAdmin.fullName || 'Administrator',
      };
    }

    const adminSess = verifyAdminSessionToken(cleanToken);
    if (adminSess) {
      if (canUseLiveSupabaseData()) {
        const dbIdentity = await getAdminIdentityByEmail(adminSess.email).catch(() => null);
        if (dbIdentity) {
          return {
            userId: dbIdentity.id,
            role: dbIdentity.staffRole || dbIdentity.role,
            email: dbIdentity.email,
            fullName: dbIdentity.fullName || 'Administrator',
          };
        }
      }
      return {
        userId: adminSess.sub || 'usr-admin-01',
        role: 'super_admin',
        email: adminSess.email,
        fullName: adminSess.fullName || 'Administrator',
      };
    }
  }

  if (cleanToken.startsWith('kz_sess_')) {
    const session = await getSession(cleanToken).catch(() => null);
    if (session) {
      return {
        userId: session.userId,
        role: session.role,
        email: session.email,
        fullName: session.fullName || 'User',
      };
    }
  }

  const supa = await verifySupabaseAccessToken(cleanToken).catch(() => null);
  if (supa) {
    return {
      userId: supa.id,
      role: supa.staffRole || supa.role,
      email: supa.email,
      fullName: supa.fullName || 'User',
    };
  }

  return null;
}

export function attachSupportWebSocket(httpServer: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (reqUrl.pathname !== '/ws/support') return;

      wss.handleUpgrade(request, socket, head, async (ws) => {
        try {
          await ensureSupportStoreHydrated();
          await hydrateFromSupabaseIfAvailable();

          const roleParam = reqUrl.searchParams.get('role');
          const threadId = String(reqUrl.searchParams.get('threadId') || '').trim();
          const token = String(reqUrl.searchParams.get('token') || '').trim();
          const visitorToken = String(reqUrl.searchParams.get('visitorToken') || '').trim();

          const identity = token ? await resolveWsIdentity(token) : null;
          const isStaff = Boolean(identity && ADMIN_STAFF_ROLES.has(identity.role));

          if (roleParam === 'admin') {
            if (!isStaff) {
              ws.close(4001, 'Staff authentication required.');
              return;
            }
            adminSockets.add(ws);
            safeSendWs(ws, {
              type: 'admin:sync',
              threads: await listAdminSupportThreads(),
            });

            ws.on('message', async (raw) => {
              try {
                const msg = JSON.parse(String(raw));
                if (msg?.type === 'ping') {
                  safeSendWs(ws, { type: 'pong' });
                  return;
                }
                if (msg?.type === 'message:send' && msg.threadId && msg.body) {
                  await appendSupportMessage({
                    threadId: String(msg.threadId),
                    senderType: 'staff',
                    senderName: identity?.fullName || identity?.email || 'Support Advisor',
                    senderId: identity?.userId,
                    body: String(msg.body),
                  });
                }
              } catch {
                // Ignore malformed ws message
              }
            });

            ws.on('close', () => {
              adminSockets.delete(ws);
            });
            return;
          }

          const bundle = threadId ? threadsMap.get(threadId) : undefined;
          const canAccess =
            bundle &&
            verifyThreadAccess(bundle, {
              visitorToken: visitorToken || token,
              userId: identity?.userId || null,
              isStaff,
            });

          if (!bundle || !canAccess) {
            ws.close(4003, 'Unauthorized or unknown support thread.');
            return;
          }

          let room = threadSockets.get(bundle.thread.id);
          if (!room) {
            room = new Set<WebSocket>();
            threadSockets.set(bundle.thread.id, room);
          }
          room.add(ws);

          safeSendWs(ws, {
            type: 'thread:sync',
            thread: bundle.thread,
            messages: bundle.messages,
          });

          ws.on('message', async (raw) => {
            try {
              const msg = JSON.parse(String(raw));
              if (msg?.type === 'ping') {
                safeSendWs(ws, { type: 'pong' });
                return;
              }
              if (msg?.type === 'message:send' && msg.body) {
                await appendSupportMessage({
                  threadId: bundle.thread.id,
                  senderType: bundle.thread.userId ? 'investor' : 'visitor',
                  senderName: String(msg.senderName || bundle.thread.visitorName),
                  senderId: identity?.userId || bundle.thread.userId,
                  body: String(msg.body),
                });
              }
            } catch {
              // Ignore malformed ws frames
            }
          });

          ws.on('close', () => {
            const set = threadSockets.get(bundle.thread.id);
            if (set) {
              set.delete(ws);
              if (set.size === 0) threadSockets.delete(bundle.thread.id);
            }
          });
        } catch {
          try {
            ws.close(1011, 'Support socket initialization error');
          } catch {}
        }
      });
    } catch {
      // Ignore upgrade errors for non-matching paths
    }
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.ping();
        } catch {}
      }
    });
  }, 30_000);
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  return wss;
}
