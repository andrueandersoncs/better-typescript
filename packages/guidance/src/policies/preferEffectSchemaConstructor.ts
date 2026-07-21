import { Function, Option, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  preferEffectSchemaConstructorMatcher,
  type PreferEffectSchemaConstructorFact
} from "@better-typescript/matchers/builtins/preferEffectSchemaConstructor"
import { makeBuiltinPolicy } from "../definePolicy.js"

const taggedMessage = (tag: string) => `Avoid returning a raw "${tag}" object literal.`

const untaggedMessage = "Avoid returning a raw object literal."

const taggedHint = (tag: string) =>
  `Reuse the existing Effect Schema for the "${tag}" protocol variant and construct it ` +
  "through schema.make. If no such model exists, first decide whether this tagged value is an " +
  "independent protocol concept or this function is only a procedural seam. Model a reusable " +
  "boundary-crossing variant with Schema.TaggedStruct and a same-named decoded interface; use " +
  "Schema.TaggedUnion for boundary-crossing unions. Use Data.TaggedEnum for internal workflow " +
  "decisions or state, and Schema.TaggedErrorClass only for typed errors."

const untaggedHint =
  "Reuse an existing Effect Schema whose semantics match this result and construct it through " +
  "schema.make. If none exists, reconsider whether this function is a real abstraction or a " +
  "procedural seam that should be collapsed into its owner. For data with independent meaning, " +
  "define a Schema.Struct with a same-named decoded interface."

const untaggedMessageFallback = Function.constant(untaggedMessage)
const untaggedHintFallback = Function.constant(untaggedHint)

const makePreferEffectSchemaConstructorFindings = (
  match: Match<PreferEffectSchemaConstructorFact>
) => {
  const tag = Option.fromNullishOr(match.fact.tag)

  const message = pipe(
    tag,
    Option.match({
      onNone: untaggedMessageFallback,
      onSome: taggedMessage
    })
  )

  const hint = pipe(
    tag,
    Option.match({
      onNone: untaggedHintFallback,
      onSome: taggedHint
    })
  )

  return makeFindings(match.target, message, hint, match.fact)
}

export const preferEffectSchemaConstructor = makeBuiltinPolicy(
  "prefer-effect-schema-constructor",
  preferEffectSchemaConstructorMatcher,
  Function.constant(makePreferEffectSchemaConstructorFindings)
)
