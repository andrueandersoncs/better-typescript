import { Function, Option, Predicate, Struct, pipe } from "effect"
import { ErrorLike } from "./errorLike.js"
import { isRecord } from "./isRecord.js"
import { isStringType } from "./isStringType.js"
import type { UnknownRecord } from "./unknownRecord.js"

const errorMessage = Struct.get<ErrorLike, "message">("message")

const hasMessageProperty = (cause: UnknownRecord): cause is UnknownRecord & ErrorLike => {
  const hasMessage = Predicate.hasProperty(cause, "message")
  const messageValue = hasMessage ? Reflect.get(cause, "message") : null
  const messageIsString = isStringType(typeof messageValue)

  return hasMessage && messageIsString
}

const isErrorLike = (cause: unknown): cause is ErrorLike =>
  pipe(Option.liftPredicate(isRecord)(cause), Option.exists(hasMessageProperty))

const hasText = (value: string) => value.length > 0

// The loader shell reuses this formatter because module-load failures render like decode failures.
export const formatCause = (cause: unknown) => {
  const fallbackText = String(cause)

  return pipe(
    Option.liftPredicate(isErrorLike)(cause),
    Option.map(errorMessage),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}
