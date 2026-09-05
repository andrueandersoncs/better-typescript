const values = new Map<string, string>()

function lookup(key: string): string {
  const cached = values.get(key)
  if (cached !== undefined) return cached
  const fresh = key.toUpperCase()
  values.set(key, fresh)
  return fresh
}

export {}
