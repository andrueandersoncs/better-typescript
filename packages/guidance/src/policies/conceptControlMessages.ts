import { Array, Function, Match as EffectMatch, Option, pipe } from "effect"
import type { ConceptSignalData } from "@better-typescript/matchers/builtins/conceptControl/data"

const emptyRelated = Function.constant("")

const relatedAt = (fact: ConceptSignalData) => (index: number) =>
  pipe(Array.get(fact.relatedConcepts, index), Option.getOrElse(emptyRelated))

const relatedConcept = relatedAt

const messageForClosed = (closed: ConceptSignalData) => {
  const concept = closed.concept
  const owner = closed.owner

  return `${concept} and ${owner} form a closed abstraction with at most one external owner.`
}

const messageForRedundantAlias = (alias: ConceptSignalData) => {
  const concept = alias.concept
  const renamed = relatedConcept(alias)(0)

  return `${concept} renames ${renamed} without adding independent semantics.`
}

const messageForDuplicateShape = (duplicate: ConceptSignalData) => {
  const concept = duplicate.concept
  const structure = relatedConcept(duplicate)(0)

  return `${concept} duplicates the concrete structure of ${structure}.`
}

const messageForFunctionDerived = (derived: ConceptSignalData) =>
  `${derived.concept} is named after its sole function role instead of independent semantics.`

const messageForSpeculativeExport = (speculative: ConceptSignalData) =>
  `${speculative.concept} is exported without an independent first-party consumer or established boundary.`

const messageForUnusedField = (unused: ConceptSignalData) => {
  const concept = unused.concept
  const field = relatedConcept(unused)(0)

  return `${concept}.${field} is constructed but never independently read.`
}

const messageForMissingRationale = (missing: ConceptSignalData) =>
  `${missing.concept} lacks a complete, structurally supported data-structure rationale.`

const messageForParameterBag = (bag: ConceptSignalData) => {
  const concept = bag.concept
  const owner = bag.owner

  return `${concept} is constructed only to cross the ${owner} call seam.`
}

const messageForPassThroughConversion = (conversion: ConceptSignalData) => {
  const owner = conversion.owner
  const source = relatedAt(conversion)(0)
  const target = relatedAt(conversion)(1)

  return `${owner} copies ${source} into ${target} without transformation.`
}

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
