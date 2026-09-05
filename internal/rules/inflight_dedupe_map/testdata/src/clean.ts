import * as Effect from "effect/Effect"

function load(key: string): string { return key.toUpperCase() }

const commands = new Map<string, Effect.Effect<string>>()
function commandFor(key: string): Effect.Effect<string> {
  const existing = commands.get(key)
  if (existing !== undefined) return existing
  const command = Effect.succeed(load(key))
  commands.set(key, command)
  return command
}

const promiseKeys = new Map<Promise<string>, string>()
promiseKeys.set(Promise.resolve("key"), "value")

const pending = new Map<string | number, Promise<string>>()
function differentLiterals(): Promise<string> {
  const existing = pending.get(1)
  if (existing !== undefined) return existing
  const running = Promise.resolve(load("1"))
  pending.set("1", running)
  return running
}

function refreshOnly(key: string): Promise<string> | undefined {
  const existing = pending.get(key)
  if (existing === undefined) return existing
  pending.set(key, Promise.resolve(load(key)))
  return existing
}

function readOnly(key: string): Promise<string> | undefined {
  const existing = pending.get(key)
  if (existing !== undefined) return existing
  return undefined
}
function writeOnly(key: string): void { pending.set(key, Promise.resolve(load(key))) }

{
  class Map<K, V> {
    get(_key: K): V | undefined { return undefined }
    set(_key: K, _value: V): void {}
  }
  const local = new Map<string, Promise<string>>()
  const key = "local"
  const existing = local.get(key)
  if (existing === undefined) local.set(key, Promise.resolve(key))
}

void commandFor
void differentLiterals
void refreshOnly
void readOnly
void writeOnly
