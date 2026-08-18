import { noErrorTypeScanner } from "../builtins/noErrorType.js"
import { noNewErrorScanner } from "../builtins/noNewError.js"
import { noThrowScanner } from "../builtins/noThrow.js"
import { noTryCatchScanner } from "../builtins/noTryCatch.js"
import { noUndefinedScanner } from "../builtins/noUndefined.js"
import { noUnusedScanner } from "../builtins/noUnused.js"
import { noVoidFunctionsScanner } from "../builtins/noVoidFunctions.js"
import { processEnvironmentScanner } from "../builtins/processEnvironment.js"
import { Array, pipe } from "effect"
import type { RuleMessage } from "../rule/ruleMessage.js"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"
import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"

const makeProcessEnvironment = () => {
  const message = "Avoid reading process.env directly in production code."

  const hint =
    "Declare runtime configuration with Effect Config and inject a ConfigProvider at the " +
    "application boundary. Keep direct environment access only in composition roots and tests."

  const processEnvironment = makeRule("process-environment")(processEnvironmentScanner)(
    fixedRuleMessage(message, hint)
  )

  return processEnvironment
}

export const processEnvironment = makeProcessEnvironment()

export const environmentRules: ReadonlyArray<Rule> = Array.make(processEnvironment)

const noUndefinedMessages = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration": "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
} as const

const makeNoUndefined = () => {
  const optionHint =
    "Use Effect's Option module to model optional values, and convert nullable boundaries " +
    "with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a " +
    "third-party signature forces undefined on a callback, keep the callback inline or " +
    "annotate it with the library's own callback type so the undefined stays in the " +
    "library's declaration, not yours."

  const makeNoUndefinedRuleMessage: RuleMessage<
    typeof noUndefinedScanner extends Scanner<infer Fact> ? Fact : never
  > = () => (match: Match<typeof noUndefinedScanner extends Scanner<infer Fact> ? Fact : never>) =>
    makeRuleMessage(noUndefinedMessages[match.fact.kind], optionHint)

  const noUndefined = makeRule("no-undefined")(noUndefinedScanner)(makeNoUndefinedRuleMessage)

  return noUndefined
}

export const noUndefined = makeNoUndefined()

const makeNoUnused = () => {
  const message = "Avoid unused imports, declarations, and parameters."

  const hint =
    "Delete the unused import, variable, function, type, or parameter. " +
    "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

  const noUnused = makeRule("no-unused")(noUnusedScanner)(fixedRuleMessage(message, hint))

  return noUnused
}

export const noUnused = makeNoUnused()

const makeNoVoidFunctions = () => {
  const message = "Avoid functions that return void."

  const hint =
    "A void function either does nothing or performs a side-effect. If it does nothing, " +
    "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
    "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
    "run. When a third-party API requires a void callback, annotate the value with that " +
    "API's callback type so the void contract is the consumer's, not yours."

  const noVoidFunctions = makeRule("no-void-functions")(noVoidFunctionsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noVoidFunctions
}

export const noVoidFunctions = makeNoVoidFunctions()

export const absenceAndUsageRules: ReadonlyArray<Rule> = Array.make(
  noUndefined,
  noUnused,
  noVoidFunctions
)

const makeNoThrow = () => {
  const message = "Avoid throwing errors with throw."

  const hint =
    "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: " +
    'class CustomError extends Schema.TaggedErrorClass<CustomError>()("CustomError", {}) {}; yield* new CustomError().'

  const noThrow = makeRule("no-throw")(noThrowScanner)(fixedRuleMessage(message, hint))

  return noThrow
}

export const noThrow = makeNoThrow()

const makeNoNewError = () => {
  const message = "Avoid using new Error() directly."

  const hint =
    "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
    "instead of bare new Error()."

  const noNewError = makeRule("no-new-error")(noNewErrorScanner)(fixedRuleMessage(message, hint))

  return noNewError
}

export const noNewError = makeNoNewError()

const makeNoErrorType = () => {
  const message = "Avoid the built-in Error type."

  const hint =
    "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
    "type parameter, or use unknown at an untyped boundary."

  const noErrorType = makeRule("no-error-type")(noErrorTypeScanner)(fixedRuleMessage(message, hint))

  return noErrorType
}

export const noErrorType = makeNoErrorType()

const makeNoTryCatch = () => {
  const message = "Avoid try/catch for error handling."

  const hint =
    "Model effectful code that can fail as an Effect and declare its failures as explicit " +
    'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
    "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."

  const noTryCatch = makeRule("no-try-catch")(noTryCatchScanner)(fixedRuleMessage(message, hint))

  return noTryCatch
}

export const noTryCatch = makeNoTryCatch()

export const explicitErrorRules: ReadonlyArray<Rule> = Array.make(
  noThrow,
  noNewError,
  noErrorType,
  noTryCatch
)

export const errorHygieneRules: ReadonlyArray<Rule> = pipe(
  explicitErrorRules,
  Array.appendAll(absenceAndUsageRules),
  Array.appendAll(environmentRules)
)
