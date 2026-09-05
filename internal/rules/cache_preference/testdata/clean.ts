import * as Effect from "effect/Effect"

function load(key: string): string { return key.toUpperCase() }

const first = new Map<string, string>()
const second = new Map<string, string>()
function separateMaps(key: string): string {
  const cached = first.get(key)
  if (cached !== undefined) return cached
  const fresh = load(key)
  second.set(key, fresh)
  return fresh
}

const commands = new Map<string, Effect.Effect<string>>()
function commandFor(key: string): Effect.Effect<string> {
  const existing = commands.get(key)
  if (existing !== undefined) return existing
  const fresh = Effect.succeed(key)
  commands.set(key, fresh)
  return fresh
}

const literalValues = new Map<string | number, string>()
function differentLiterals(): string {
  const cached = literalValues.get(1)
  if (cached !== undefined) return cached
  const fresh = load("1")
  literalValues.set("1", fresh)
  return fresh
}

function refreshOnly(key: string): string | undefined {
  const existing = first.get(key)
  if (existing === undefined) return existing
  first.set(key, load(key))
  return existing
}

function readOnly(key: string): string {
  const cached = first.get(key)
  if (cached !== undefined) return cached
  return "fallback"
}
function writeOnly(key: string): void { first.set(key, load(key)) }

type Timed = { readonly value: string; readonly until: number }
const timed = new Map<string, Timed>()
timed.set("k", { value: "seed", until: Date.now() + 1_000 })
function loadTimed(key: string): Timed { return { value: key, until: Date.now() + 1_000 } }
function timedLookup(): Timed {
  const entry = timed.get("k")
  if (entry !== undefined && entry.until < Date.now()) timed.delete("k")
  if (entry !== undefined) return entry
  const fresh = loadTimed("k")
  timed.set("k", fresh)
  return fresh
}

{
  class Map<K, V> {
    get(_key: K): V | undefined { return undefined }
    set(_key: K, _value: V): void {}
  }
  const local = new Map<string, string>()
  const key = "local"
  const cached = local.get(key)
  if (cached === undefined) local.set(key, load(key))
}

void separateMaps
void commandFor
void differentLiterals
void refreshOnly
void readOnly
void writeOnly
void timedLookup

export {}
