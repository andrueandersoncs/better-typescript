import { Effect, HashMap, Ref } from "effect"

const plansByProgram = Ref.make(HashMap.empty<object, ReadonlyArray<string>>())

const makeCache = Effect.gen(function*() {
  const state = yield* Ref.make(HashMap.empty<object, number>())

  return state
})

const weakSet = new WeakSet<object>()

type WeakMap<Key extends object, Value> = ReadonlyArray<readonly [Key, Value]>

declare const WeakMap: <Key extends object, Value>() => WeakMap<Key, Value>

const custom = WeakMap<object, string>()

void plansByProgram
void makeCache
void weakSet
void custom
