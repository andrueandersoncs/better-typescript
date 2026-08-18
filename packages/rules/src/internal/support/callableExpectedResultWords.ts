import { CallableSemantics } from "./callableSemanticsClass.js"
import { pipe, Option, Struct, Array } from "effect"

export const callableExpectedResultWords = (semantics: CallableSemantics): ReadonlyArray<string> =>
  pipe(
    semantics.projection,
    Option.map(Struct.get("resultWords")),
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.getOrElse(() => semantics.result.words)
  )
