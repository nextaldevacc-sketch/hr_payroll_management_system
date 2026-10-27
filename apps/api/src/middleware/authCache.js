/**
 * In-memory Session Validation Cache
 *
 * Caches user and company active/locked/suspended state for at most 60 seconds.
 * Invalidated immediately on password change, user status change, role change, and company status change.
 */

const sessionCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds max TTL per spec

export function getCachedUserSession(userId) {
  if (!userId) return null;
  const entry = sessionCache.get(userId);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.cachedAt > CACHE_TTL_MS) {
    sessionCache.delete(userId);
    return null;
  }

  return entry;
}

export function setCachedUserSession(userId, data) {
  if (!userId) return;
  sessionCache.set(userId, {
    ...data,
    cachedAt: Date.now(),
  });
}

export function invalidateUserSession(userId) {
  if (!userId) return;
  sessionCache.delete(userId);
}

export function invalidateCompanySessions(companyId) {
  if (!companyId) return;
  for (const [userId, data] of sessionCache.entries()) {
    if (data.companyId === companyId) {
      sessionCache.delete(userId);
    }
  }
}

export function clearSessionCache() {
  sessionCache.clear();
}
