import { Function, Option, Predicate, Struct, pipe } from "effect"
import { strictEqual } from "../../engine/equivalence/strictEqual.js"
import { ErrorLike } from "./errorLike.js"
import { isRecord } from "./isRecord.js"
import type { UnknownRecord } from "./unknownRecord.js"

const isStringType = strictEqual("string")
const errorMessage = Struct.get<ErrorLike, "message">("message")

const hasMessageProperty = (record: UnknownRecord): record is UnknownRecord & ErrorLike => {
  const hasMessage = Predicate.hasProperty(record, "message")
  const messageValue = hasMessage ? Reflect.get(record, "message") : null
  const messageType = typeof messageValue
  const messageIsString = isStringType(messageType)

  return hasMessage && messageIsString
}

const isErrorLike = (value: unknown): value is ErrorLike =>
  pipe(Option.liftPredicate(isRecord)(value), Option.exists(hasMessageProperty))

const hasText = (value: string) => value.length > 0

export const formatCause = (cause: unknown) => {
  const fallbackText = String(cause)

  return pipe(
    Option.liftPredicate(isErrorLike)(cause),
    Option.map(errorMessage),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}
