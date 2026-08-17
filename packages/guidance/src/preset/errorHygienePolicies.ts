import { Array, pipe } from "effect"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { safetyMatcherCatalog } from "@better-typescript/matchers/builtins/safetyMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makeProcessEnvironment = () => {
  const message = "Avoid reading process.env directly in production code."

  const hint =
    "Declare runtime configuration with Effect Config and inject a ConfigProvider at the " +
    "application boundary. Keep direct environment access only in composition roots and tests."

  const processEnvironment = makeBuiltinPolicy({
    name: "process-environment",
    matcher: safetyMatcherCatalog.processEnvironmentMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return processEnvironment
}

export const processEnvironment = makeProcessEnvironment()

export const environmentPolicies: ReadonlyArray<Policy> = Array.make(processEnvironment)

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

  const noUndefinedGuidance: Guidance<
    typeof safetyMatcherCatalog.noUndefinedMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof safetyMatcherCatalog.noUndefinedMatcher extends Matcher<infer Fact> ? Fact : never
      >
    ) =>
      makeFindings(match.target, noUndefinedMessages[match.fact.kind], optionHint, match.fact)

  const noUndefined = makeBuiltinPolicy({
    name: "no-undefined",
    matcher: safetyMatcherCatalog.noUndefinedMatcher,
    guidance: noUndefinedGuidance,
    reported: true,
    stage: "program"
  })

  return noUndefined
}

export const noUndefined = makeNoUndefined()

const makeNoUnused = () => {
  const message = "Avoid unused imports, declarations, and parameters."

  const hint =
    "Delete the unused import, variable, function, type, or parameter. " +
    "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

  const noUnused = makeBuiltinPolicy({
    name: "no-unused",
    matcher: safetyMatcherCatalog.noUnusedMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

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

  const noVoidFunctions = makeBuiltinPolicy({
    name: "no-void-functions",
    matcher: safetyMatcherCatalog.noVoidFunctionsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noVoidFunctions
}

export const noVoidFunctions = makeNoVoidFunctions()

export const absenceAndUsagePolicies: ReadonlyArray<Policy> = Array.make(
  noUndefined,
  noUnused,
  noVoidFunctions
)

const makeNoThrow = () => {
  const message = "Avoid throwing errors with throw."

  const hint =
    "Create a custom error with Schema.TaggedErrorClass, then yield it instead, for example: " +
    'class CustomError extends Schema.TaggedErrorClass<CustomError>()("CustomError", {}) {}; yield* new CustomError().'

  const noThrow = makeBuiltinPolicy({
    name: "no-throw",
    matcher: safetyMatcherCatalog.noThrowMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noThrow
}

export const noThrow = makeNoThrow()

const makeNoNewError = () => {
  const message = "Avoid using new Error() directly."

  const hint =
    "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
    "instead of bare new Error()."

  const noNewError = makeBuiltinPolicy({
    name: "no-new-error",
    matcher: safetyMatcherCatalog.noNewErrorMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noNewError
}

export const noNewError = makeNoNewError()

const makeNoErrorType = () => {
  const message = "Avoid the built-in Error type."

  const hint =
    "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
    "type parameter, or use unknown at an untyped boundary."

  const noErrorType = makeBuiltinPolicy({
    name: "no-error-type",
    matcher: safetyMatcherCatalog.noErrorTypeMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noErrorType
}

export const noErrorType = makeNoErrorType()

const makeNoTryCatch = () => {
  const message = "Avoid try/catch for error handling."

  const hint =
    "Model effectful code that can fail as an Effect and declare its failures as explicit " +
    'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
    "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."

  const noTryCatch = makeBuiltinPolicy({
    name: "no-try-catch",
    matcher: safetyMatcherCatalog.noTryCatchMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noTryCatch
}

export const noTryCatch = makeNoTryCatch()

export const explicitErrorPolicies: ReadonlyArray<Policy> = Array.make(
  noThrow,
  noNewError,
  noErrorType,
  noTryCatch
)

// Member order is pinned because concatenated categories define the public report block order.
export const errorHygienePolicies: ReadonlyArray<Policy> = pipe(
  explicitErrorPolicies,
  Array.appendAll(absenceAndUsagePolicies),
  Array.appendAll(environmentPolicies)
)
