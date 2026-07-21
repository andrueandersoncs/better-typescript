import { Function, Schema } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  preferInferredTypesMatcher,
  type PreferInferredTypesFact,
  type PreferInferredTypesKind
} from "@better-typescript/matchers/builtins/preferInferredTypes"
import { makeBuiltinPolicy } from "../definePolicy.js"

const InferredTypeCopy = Schema.Struct({
  message: Schema.String,
  hint: Schema.String
})

// InferredTypeCopy is message/hint prose because kind copies share one record.
interface InferredTypeCopy extends Schema.Schema.Type<typeof InferredTypeCopy> {}

const constCopy = InferredTypeCopy.make({
  message: "Avoid a const annotation when its initializer infers the same type.",
  hint: "Delete the type annotation. Keep annotations that widen a value or guide generic inference."
})

const returnCopy = InferredTypeCopy.make({
  message: "Avoid a return annotation when the function body infers the same type.",
  hint: "Delete the return type annotation. Keep explicit contracts when inference changes the signature."
})

const contextualCopy = InferredTypeCopy.make({
  message: "Avoid annotations on a contextually typed function.",
  hint: "Delete the parameter and return annotations together; the surrounding expression supplies them."
})

const copies: Record<PreferInferredTypesKind, InferredTypeCopy> = {
  const: constCopy,
  return: returnCopy,
  contextual: contextualCopy
}

const makePreferInferredTypesFindings = (match: Match<PreferInferredTypesFact>) => {
  const copy = copies[match.fact.kind]

  return makeFindings(match.target, copy.message, copy.hint, match.fact)
}

export const preferInferredTypes = makeBuiltinPolicy(
  "prefer-inferred-types",
  preferInferredTypesMatcher,
  Function.constant(makePreferInferredTypesFindings)
)
