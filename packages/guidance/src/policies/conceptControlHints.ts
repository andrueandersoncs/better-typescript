import { Array, Function, Match as EffectMatch, Option, pipe } from "effect"
import type { ConceptSignalData } from "@better-typescript/matchers/builtins/conceptControl/data"

const emptyRelated = Function.constant("")

const relatedConcept = (fact: ConceptSignalData) =>
  pipe(Array.get(fact.relatedConcepts, 0), Option.getOrElse(emptyRelated))

const rationaleHint =
  "Delete or reuse this concept before documenting it. If it remains, add one single-line " +
  "comment directly above the declaration explaining because why existing concepts are " +
  "insufficient. The prose does not suppress structural evidence."

const closedHint =
  "Collapse the function and its private data vocabulary into their external owner, reuse an " +
  "existing concept, or deepen the Module until the abstraction has independent leverage. Do " +
  "not replace the named model with an anonymous object type."

const duplicateHint =
  "Reuse the existing data structure or merge the concepts. Keep a distinct representation only " +
  "for an independently evolving boundary or invariant, and retain the duplicate evidence for review."

const functionDerivedHint =
  "Remove or deepen the function-data abstraction, or replace this structural-role name with an " +
  "existing domain concept. A new name must mean more than input, output, options, context, state, " +
  "or result for one function."

const speculativeExportHint =
  "Remove the export and keep ownership local, or connect the model to an intentional public seam. " +
  "Exporting a declaration does not establish reuse and must not evade abstraction analysis."

const unusedFieldHint =
  "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical " +
  "forwarding into another representation is not a read and instead indicates parallel concepts."

const parameterBagHint =
  "Remove or deepen the function seam, reuse existing domain values, or make this model a genuine " +
  "command with independent semantics. Do not explode it into primitive parameters or an anonymous " +
  "object type."

const passThroughConversionHint =
  "Collapse the parallel representations or document and preserve the real boundary that requires " +
  "both. A field-for-field adapter is evidence against introducing another first-party concept."

const hintForRedundantAlias = (alias: ConceptSignalData) => {
  const existing = relatedConcept(alias)

  return (
    `Use ${existing} directly, merge the concepts, or add a real invariant or independently ` +
    "evolving boundary. Do not keep a second name only to describe structural use."
  )
}

export const hintFor = (fact: ConceptSignalData) =>
  pipe(
    EffectMatch.value(fact),
    EffectMatch.when({ kind: "closed-abstraction" }, Function.constant(closedHint)),
    EffectMatch.when({ kind: "redundant-alias" }, hintForRedundantAlias),
    EffectMatch.when({ kind: "duplicate-shape" }, Function.constant(duplicateHint)),
    EffectMatch.when({ kind: "function-derived-model" }, Function.constant(functionDerivedHint)),
    EffectMatch.when({ kind: "speculative-export" }, Function.constant(speculativeExportHint)),
    EffectMatch.when({ kind: "unused-field" }, Function.constant(unusedFieldHint)),
    EffectMatch.when({ kind: "missing-rationale" }, Function.constant(rationaleHint)),
    EffectMatch.when({ kind: "parameter-bag" }, Function.constant(parameterBagHint)),
    EffectMatch.when(
      { kind: "pass-through-conversion" },
      Function.constant(passThroughConversionHint)
    ),
    EffectMatch.exhaustive
  )
