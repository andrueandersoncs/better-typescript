const entries = new Map<string, { value: string; createdAt: number; expiresAt: number }>()

function load(key: string): string { return key.toUpperCase() }
function lookup(key: string): string {
  const entry = entries.get(key)
  if (entry !== undefined) console.log(entry.createdAt < Date.now())
  if (entry !== undefined && entry.expiresAt < Date.now()) entries.delete(key)
  if (entry !== undefined) return entry.value
  const value = load(key)
  entries.set(key, { value, createdAt: Date.now(), expiresAt: Date.now() + 1_000 })
  return value
}

void lookup

export {}
