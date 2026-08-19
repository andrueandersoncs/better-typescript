import { MutableRef, Option, Struct, Tuple, flow, pipe } from "effect"
import { strictEqual } from "../equivalence.js"

const cachedValueFor =
  <Key extends object>(key: Key) =>
  <Value extends object>(entry: readonly [WeakRef<Key>, WeakRef<Value>]) => {
    const keyReference = Tuple.get(entry, 0)
    const valueReference = Tuple.get(entry, 1)
    const dereferencedKey = keyReference.deref()
    const dereferencedValue = valueReference.deref()
    const cachedKey = Option.fromNullishOr(dereferencedKey)
    const cachedValue = Option.fromNullishOr(dereferencedValue)

    return pipe(
      Option.all({ key: cachedKey, value: cachedValue }),
      Option.filter(flow(Struct.get("key"), strictEqual(key))),
      Option.map(Struct.get("value"))
    )
  }

// A latest identity owner uses weak entries because analysis completion must release compiler graphs.
export const makeLatestIdentityOwner = <Key extends object, Input, Value extends object>(
  build: (input: Input) => Value
) => {
  const empty = Option.none<readonly [WeakRef<Key>, WeakRef<Value>]>()
  const latest = MutableRef.make(empty)

  const inputForKey = (key: Key) => {
    const valueForInput = (input: Input) => {
      const cached = pipe(MutableRef.get(latest), Option.flatMap(cachedValueFor(key)))

      if (Option.isSome(cached)) {
        return cached.value
      }

      const value = build(input)
      const keyReference = new WeakRef(key)
      const valueReference = new WeakRef(value)
      const references = Tuple.make(keyReference, valueReference)
      const entry = Option.some(references)

      MutableRef.set(latest, entry)

      return value
    }

    return valueForInput
  }

  return inputForKey
}
