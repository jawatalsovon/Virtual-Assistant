import type { ChatMessage } from "./agent";

/**
 * In-memory session store for conversation history.
 * Keyed by a session identifier (e.g., Telegram chatId).
 *
 * NOTE: This lives in server memory, so it resets on cold starts
 * (Vercel redeploys, server restarts). For a single-user assistant
 * this is acceptable — Vercel keeps functions warm for several minutes
 * between invocations.
 */

const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages per session
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Session {
  messages: ChatMessage[];
  lastAccessed: number;
}

const sessions = new Map<string, Session>();

/**
 * Get conversation history for a session.
 */
export function getSessionHistory(sessionId: string): ChatMessage[] {
  const session = sessions.get(sessionId);
  if (!session) return [];

  // Check TTL — expire stale sessions
  if (Date.now() - session.lastAccessed > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return [];
  }

  session.lastAccessed = Date.now();
  return session.messages;
}

/**
 * Add a message to a session's history.
 */
export function addToSession(sessionId: string, message: ChatMessage): void {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { messages: [], lastAccessed: Date.now() };
    sessions.set(sessionId, session);
  }

  session.messages.push(message);
  session.lastAccessed = Date.now();

  // Trim to keep only the last N messages
  if (session.messages.length > MAX_HISTORY_LENGTH) {
    session.messages = session.messages.slice(-MAX_HISTORY_LENGTH);
  }
}

/**
 * Clear a session's history.
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Periodically clean up expired sessions to prevent memory leaks.
 */
function cleanupSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupSessions, 10 * 60 * 1000);
