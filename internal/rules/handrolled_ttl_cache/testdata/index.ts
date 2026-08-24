const cache = new Map<string, { expiresAt: number }>()
const expiresAt = Date.now() + 1000
if (expiresAt < Date.now()) cache.delete("key")
declare const Cache: any
const managed = Cache.make({})
