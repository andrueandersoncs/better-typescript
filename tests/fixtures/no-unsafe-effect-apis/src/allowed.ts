import { HashMap, Option, Ref, Result } from "effect"
import type { makeUnsafe as MakeUnsafeType } from "effect/Ref"
import { makeUnsafe as externalMakeUnsafe, unsafeParse } from "@acme/unsafe-kit"

const empty = HashMap.empty<string, number>()

export const safeRef = Ref.make(0)
export const safeMapGet = HashMap.get(empty, "k")
export const safeOption = Option.fromNullishOr(null)
export const safeResult = Result.succeed(1)

const makeUnsafeLocal = (value: number): number => value
export const localUnsafeCall = makeUnsafeLocal(1)

export const externalUnsafe = externalMakeUnsafe(2)
export const externalLower = unsafeParse("{}")

export const unsafeNameInString = "makeUnsafe"
export const docs = "Avoid Ref.makeUnsafe and HashMap.getUnsafe"

// Type-only reference: typeof on the type-only imported binding is excluded.
type MakeUnsafeAlias = typeof MakeUnsafeType

export type TypeOnlyRefs = {
  make: MakeUnsafeAlias
}
