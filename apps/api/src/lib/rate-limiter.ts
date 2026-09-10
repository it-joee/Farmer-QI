/**
 * Simple in-memory brute-force protection for the login endpoint.
 *
 * Tracks failed attempts per email address. After MAX_ATTEMPTS failures
 * within WINDOW_MS the account is locked for LOCKOUT_MS.
 *
 * This is intentionally lightweight — no extra dependencies, no DB writes
 * on every attempt. Works correctly for a single-process Node.js server.
 */

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
  windowStart: number;
}

// Configuration
const MAX_ATTEMPTS = 5;          // max failed attempts before lockout
const WINDOW_MS = 15 * 60_000;  // 15-minute sliding window
const LOCKOUT_MS = 30 * 60_000; // 30-minute lockout after max attempts

const store = new Map<string, AttemptRecord>();

/** Returns the remaining lockout time in minutes, or 0 if not locked. */
export function getLockoutMinutes(key: string): number {
  const rec = store.get(key);
  if (!rec?.lockedUntil) return 0;
  const remaining = rec.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60_000) : 0;
}

/** Call this after a confirmed failed login attempt. */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  let rec = store.get(key);

  if (!rec || now - rec.windowStart > WINDOW_MS) {
    // Start a fresh window
    rec = { count: 1, lockedUntil: null, windowStart: now };
  } else {
    rec.count += 1;
    if (rec.count >= MAX_ATTEMPTS) {
      rec.lockedUntil = now + LOCKOUT_MS;
    }
  }

  store.set(key, rec);
}

/** Call this after a successful login to clear any prior failures. */
export function clearFailedAttempts(key: string): void {
  store.delete(key);
}

/** Periodically clean up stale entries so the Map doesn't grow forever. */
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store) {
    const expired = rec.lockedUntil
      ? now > rec.lockedUntil + LOCKOUT_MS          // well past lockout
      : now - rec.windowStart > WINDOW_MS * 2;      // twice the window with no activity
    if (expired) store.delete(key);
  }
}, 10 * 60_000); // run every 10 minutes
