interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipStore = new Map<string, RateLimitEntry>();
const tenantStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, store: Map<string, RateLimitEntry>, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    // Optional: prune expired entries periodically
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}