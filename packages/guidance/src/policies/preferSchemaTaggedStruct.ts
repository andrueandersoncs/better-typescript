import { preferSchemaTaggedStructMatcher } from "@better-typescript/matchers/builtins/preferSchemaTaggedStruct"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Prefer Schema.TaggedStruct when every field has a portable wire representation."

const hint =
  "This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable " +
  "boundary, define it with Schema.TaggedStruct and a same-named decoded interface. Compose " +
  "multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound " +
  "values such as streams, effects, functions, compiler objects, and live handles, and use " +
  "Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only " +
  "for typed errors."

export const preferSchemaTaggedStruct = makeBuiltinPolicy(
  "prefer-schema-tagged-struct",
  preferSchemaTaggedStructMatcher,
  factGuidance(message, hint)
)
