import { Option, pipe } from "effect"
import { isFunctionType } from "./isFunctionType.js"
import { isRecord } from "./isRecord.js"
import type { UnknownRecord } from "./unknownRecord.js"

// MatcherCallableField is plan or match because those callable fields discriminate policies.
export type MatcherCallableField = "plan" | "match"

export const matcherHasCallableField = (field: MatcherCallableField) => {
  const recordFieldIsCallable = (record: UnknownRecord) => isFunctionType(typeof record[field])

  const matcherRecordIsCallable = (matcher: unknown) =>
    pipe(Option.liftPredicate(isRecord)(matcher), Option.exists(recordFieldIsCallable))

  return matcherRecordIsCallable
}
