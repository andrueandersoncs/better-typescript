import { Array, Function, Match as EffectMatch, Option, pipe } from "effect"
import type { ConceptSignalData } from "@better-typescript/matchers/builtins/conceptControl/data"

const emptyRelated = Function.constant("")

const relatedAt = (fact: ConceptSignalData) => (index: number) =>
  pipe(Array.get(fact.relatedConcepts, index), Option.getOrElse(emptyRelated))

const messageForClosed = (closed: ConceptSignalData) =>
  `${closed.concept} and ${closed.owner} form a closed abstraction with at most one external owner.`

const messageForRedundantAlias = (alias: ConceptSignalData) =>
  `${alias.concept} renames ${relatedAt(alias)(0)} without adding independent semantics.`

const messageForDuplicateShape = (duplicate: ConceptSignalData) =>
  `${duplicate.concept} duplicates the concrete structure of ${relatedAt(duplicate)(0)}.`

const messageForFunctionDerived = (derived: ConceptSignalData) =>
  `${derived.concept} is named after its sole function role instead of independent semantics.`

const messageForSpeculativeExport = (speculative: ConceptSignalData) =>
  `${speculative.concept} is exported without an independent first-party consumer or established boundary.`

const messageForUnusedField = (unused: ConceptSignalData) =>
  `${unused.concept}.${relatedAt(unused)(0)} is constructed but never independently read.`

const messageForMissingRationale = (missing: ConceptSignalData) =>
  `${missing.concept} lacks a complete, structurally supported data-structure rationale.`

const messageForParameterBag = (bag: ConceptSignalData) =>
  `${bag.concept} is constructed only to cross the ${bag.owner} call seam.`

const messageForPassThroughConversion = (conversion: ConceptSignalData) =>
  `${conversion.owner} copies ${relatedAt(conversion)(0)} into ${relatedAt(conversion)(1)} without transformation.`

export const messageFor = (fact: ConceptSignalData) =>
  pipe(
    EffectMatch.value(fact),
    EffectMatch.when({ kind: "closed-abstraction" }, messageForClosed),
    EffectMatch.when({ kind: "redundant-alias" }, messageForRedundantAlias),
    EffectMatch.when({ kind: "duplicate-shape" }, messageForDuplicateShape),
    EffectMatch.when({ kind: "function-derived-model" }, messageForFunctionDerived),
    EffectMatch.when({ kind: "speculative-export" }, messageForSpeculativeExport),
    EffectMatch.when({ kind: "unused-field" }, messageForUnusedField),
    EffectMatch.when({ kind: "missing-rationale" }, messageForMissingRationale),
    EffectMatch.when({ kind: "parameter-bag" }, messageForParameterBag),
    EffectMatch.when({ kind: "pass-through-conversion" }, messageForPassThroughConversion),
    EffectMatch.exhaustive
  )
