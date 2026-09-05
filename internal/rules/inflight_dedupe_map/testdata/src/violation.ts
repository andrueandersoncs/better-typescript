const pending = new Map<string, Promise<string>>()

function load(key: string): string { return key.toUpperCase() }
function getOrStart(key: string): Promise<string> {
  const existing = pending.get(key)
  if (existing !== undefined) return existing
  const running = Promise.resolve(load(key))
  pending.set(key, running)
  return running
}

void getOrStart
