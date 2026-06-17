type Entry<T> = { value: T; expiresAt: number };
const store = new Map<string, Entry<unknown>>();

export function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function del(key: string): void {
  store.delete(key);
}
