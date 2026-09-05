import * as Effect from "effect/Effect"

const entries = new Map<string, { value: string; expiresAt: number }>()
const other = new Map<string, { value: string; expiresAt: number }>()

function load(key: string): string { return key.toUpperCase() }
function separateMaps(key: string): string {
  const entry = entries.get(key)
  if (entry !== undefined && entry.expiresAt < Date.now()) other.delete(key)
  const value = load(key)
  entries.set(key, { value, expiresAt: Date.now() + 1_000 })
  return value
}

const commands = new Map<string, Effect.Effect<string>>()
function commandFor(key: string): Effect.Effect<string> {
  const existing = commands.get(key)
  if (existing !== undefined) return existing
  const fresh = Effect.succeed(key)
  commands.set(key, fresh)
  return fresh
}

const literalEntries = new Map<string | number, { expiresAt: number }>()
function differentLiterals(): void {
  const entry = literalEntries.get(1)
  if (entry !== undefined && entry.expiresAt < Date.now()) literalEntries.delete("1")
  literalEntries.set("1", { expiresAt: Date.now() + 1_000 })
}

{
  class Map<K, V> {
    get(_key: K): V | undefined { return undefined }
    set(_key: K, _value: V): void {}
    delete(_key: K): boolean { return true }
  }
  const local = new Map<string, { expiresAt: number }>()
  const key = "local"
  const entry = local.get(key)
  if (entry !== undefined && entry.expiresAt < Date.now()) local.delete(key)
  local.set(key, { expiresAt: Date.now() + 1_000 })
}

void separateMaps
void commandFor
void differentLiterals

export {}
