import type { ConceptRuleData } from "../builtins/concepts/conceptScanners.js"
import { noPassThroughObjectWrappersScanner } from "../builtins/noPassThroughObjectWrappers.js"
import { noReexportsScanner } from "../builtins/noReexports.js"
import { noValueAliasesScanner } from "../builtins/noValueAliases.js"
import { preferComposedCallbacksScanner } from "../builtins/preferComposedCallbacks.js"
import { preferConditionalReturnScanner } from "../builtins/preferConditionalReturn.js"
import { preferDirectBooleanReturnScanner } from "../builtins/preferDirectBooleanReturn.js"
import { preferDirectYieldScanner } from "../builtins/preferDirectYield.js"
import { preferEtaReductionScanner } from "../builtins/preferEtaReduction.js"
import { preferFunctionCompositionScanner } from "../builtins/preferFunctionComposition.js"
import { preferFunctionFlipScanner } from "../builtins/preferFunctionFlip.js"
import { preferImplicitReturnScanner } from "../builtins/preferImplicitReturn.js"
import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import type { RuleMessage } from "../rule/ruleMessage.js"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"
import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"

const makePreferComposedCallbacks = () => {
  const message = "Avoid inline callbacks that compose the callback parameter through calls."

  const hint =
    "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
    "the transformation, name the adapter in the nearest scope and pass it by reference."

  const preferComposedCallbacks = makeRule("prefer-composed-callbacks")(
    preferComposedCallbacksScanner
  )(fixedRuleMessage(message, hint))

  return preferComposedCallbacks
}

export const preferComposedCallbacks = makePreferComposedCallbacks()

const makePreferEtaReduction = () => {
  const message = "Avoid wrapping a function call that only forwards its argument."

  const etaHint =
    "Eta-reduce this arrow to the function value itself (pass f instead of " +
    "(x) => f(x)). If the callee is already partially applied, use that partial " +
    "directly. Do not nest calls."

  const flowHint =
    "Replace this nested unary call tower with flow(...steps) left-to-right " +
    "(innermost callee first). Do not nest the calls."

  const makePreferEtaReductionFindings = (
    match: Match<typeof preferEtaReductionScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeEtaFindings = () => makeRuleMessage(message, etaHint)
    const makeFlowFindings = () => makeRuleMessage(message, flowHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ style: "eta" }, makeEtaFindings),
      EffectMatch.when({ style: "flow" }, makeFlowFindings),
      EffectMatch.exhaustive
    )
  }

  const preferEtaReduction = makeRule("prefer-eta-reduction")(preferEtaReductionScanner)(
    Function.constant(makePreferEtaReductionFindings)
  )

  return preferEtaReduction
}

export const preferEtaReduction = makePreferEtaReduction()

const makePreferFunctionComposition = () => {
  const blockMessage = "Avoid block bodies that only bind a value and thread it into a call."

  const blockHint =
    "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
    "steps compose as an expression instead of a manually threaded local. Do not nest " +
    "the calls."

  const adapterMessage = "Avoid unary adapters that project a property into a partial function."

  const effectPipelineMessage =
    "Avoid straight-line Effect transformations threaded through single-use bindings."

  const effectPipelineHint =
    "Use one data-last pipe from the source Effect through each transformation and Effect.runPromise."

  const adapterHint = (typeText: string) => (propertyName: string) => (partialText: string) =>
    `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

  const makePreferFunctionCompositionFindings = (
    match: Match<typeof preferFunctionCompositionScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeBlockFindings = () => makeRuleMessage(blockMessage, blockHint)

    const makeAdapterFindings = (
      fact: Extract<
        typeof preferFunctionCompositionScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "adapter" }
      >
    ) => {
      const hint = adapterHint(fact.typeText)(fact.propertyName)(fact.partialText)

      return makeRuleMessage(adapterMessage, hint)
    }

    const makeEffectPipelineFindings = () =>
      makeRuleMessage(effectPipelineMessage, effectPipelineHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "block" }, makeBlockFindings),
      EffectMatch.when({ kind: "adapter" }, makeAdapterFindings),
      EffectMatch.when({ kind: "effect-pipeline" }, makeEffectPipelineFindings),
      EffectMatch.exhaustive
    )
  }

  const preferFunctionComposition = makeRule("prefer-function-composition")(
    preferFunctionCompositionScanner
  )(Function.constant(makePreferFunctionCompositionFindings))

  return preferFunctionComposition
}

export const preferFunctionComposition = makePreferFunctionComposition()

const makePreferFunctionFlip = () => {
  const message = "Avoid lambdas that only flip the order of a curried application."

  const hint =
    "Reorder the curried parameters so the fixed argument comes first " +
    "(data-last), then pass the partial f(y) directly — or use " +
    "Function.flip(f)(y) instead of (x) => f(x)(y)."

  const preferFunctionFlip = makeRule("prefer-function-flip")(preferFunctionFlipScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferFunctionFlip
}

export const preferFunctionFlip = makePreferFunctionFlip()

export const compositionRules: ReadonlyArray<Rule> = Array.make(
  preferComposedCallbacks,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip
)

const makeConceptRuleMessage = (match: Match<ConceptRuleData>) => {
  const emptyRelated = Function.constant("")

  const relatedConcept = (fact: ConceptRuleData) =>
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

  const hintForRedundantAlias = (alias: ConceptRuleData) => {
    const existing = relatedConcept(alias)

    return (
      `Use ${existing} directly, merge the concepts, or add a real invariant or independently ` +
      "evolving boundary. Do not keep a second name only to describe structural use."
    )
  }

  const hintFor = (fact: ConceptRuleData) =>
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

  const relatedAt = (fact: ConceptRuleData) => (index: number) =>
    pipe(Array.get(fact.relatedConcepts, index), Option.getOrElse(emptyRelated))

  const messageForClosed = (closed: ConceptRuleData) =>
    `${closed.concept} and ${closed.owner} form a closed abstraction with at most one external owner.`

  const messageForRedundantAlias = (alias: ConceptRuleData) =>
    `${alias.concept} renames ${relatedAt(alias)(0)} without adding independent semantics.`

  const messageForDuplicateShape = (duplicate: ConceptRuleData) =>
    `${duplicate.concept} duplicates the concrete structure of ${relatedAt(duplicate)(0)}.`

  const messageForFunctionDerived = (derived: ConceptRuleData) =>
    `${derived.concept} is named after its sole function role instead of independent semantics.`

  const messageForSpeculativeExport = (speculative: ConceptRuleData) =>
    `${speculative.concept} is exported without an independent first-party consumer or established boundary.`

  const messageForUnusedField = (unused: ConceptRuleData) =>
    `${unused.concept}.${relatedAt(unused)(0)} is constructed but never independently read.`

  const messageForMissingRationale = (missing: ConceptRuleData) =>
    `${missing.concept} lacks a complete, structurally supported data-structure rationale.`

  const messageForParameterBag = (bag: ConceptRuleData) =>
    `${bag.concept} is constructed only to cross the ${bag.owner} call seam.`

  const messageForPassThroughConversion = (conversion: ConceptRuleData) =>
    `${conversion.owner} copies ${relatedAt(conversion)(0)} into ${relatedAt(conversion)(1)} without transformation.`

  const messageFor = (fact: ConceptRuleData) =>
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

  const message = messageFor(match.fact)
  const hint = hintFor(match.fact)

  return makeRuleMessage(message, hint)
}

export const conceptRuleMessage: RuleMessage<ConceptRuleData> =
  Function.constant(makeConceptRuleMessage)

const makePreferConditionalReturn = () => {
  const makePreferConditionalReturnRuleMessage: RuleMessage<
    typeof preferConditionalReturnScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferConditionalReturnScanner extends Scanner<infer Fact> ? Fact : never>
    ) =>
      makeRuleMessage(
        "Avoid if statements that only choose between two return values.",
        `Return a conditional expression instead: return ${match.fact.returnText}.`
      )

  const preferConditionalReturn = makeRule("prefer-conditional-return")(
    preferConditionalReturnScanner
  )(makePreferConditionalReturnRuleMessage)

  return preferConditionalReturn
}

export const preferConditionalReturn = makePreferConditionalReturn()

const makePreferDirectBooleanReturn = () => {
  const andFalseHint =
    "Use && instead of branching to false (`cond && value`). When the false " +
    "branch is the then-arm (`cond ? false : value`), negate the condition into " +
    "a named boolean first so `!` and `&&` are not stacked in one expression."

  const makePreferDirectBooleanReturnFindings = (
    match: Match<typeof preferDirectBooleanReturnScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeLiteralBranchFindings = (
      fact: Extract<
        typeof preferDirectBooleanReturnScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "literal-branch" }
      >
    ) => {
      const returnExpression = fact.literalValue
        ? `(${fact.conditionText})`
        : `!(${fact.conditionText})`

      const literalText = String(fact.literalValue)

      return makeRuleMessage(
        `Avoid returning ${literalText} from a conditional branch.`,
        `Use the condition as the boolean value instead: return ${returnExpression}.`
      )
    }

    const makeAndFalseFindings = () =>
      makeRuleMessage("Avoid conditional return followed by return false.", andFalseHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "literal-branch" }, makeLiteralBranchFindings),
      EffectMatch.when({ kind: "and-false" }, makeAndFalseFindings),
      EffectMatch.exhaustive
    )
  }

  const preferDirectBooleanReturn = makeRule("prefer-direct-boolean-return")(
    preferDirectBooleanReturnScanner
  )(Function.constant(makePreferDirectBooleanReturnFindings))

  return preferDirectBooleanReturn
}

export const preferDirectBooleanReturn = makePreferDirectBooleanReturn()

const makePreferDirectYield = () => {
  const message = "Avoid binding an Effect only to yield* it."

  const hint =
    "Write const result = yield* expression (or yield* expression when the result " +
    "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
    "extracting nested call arguments into their own consts so no-nested-calls " +
    "stays satisfied."

  const preferDirectYield = makeRule("prefer-direct-yield")(preferDirectYieldScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferDirectYield
}

export const preferDirectYield = makePreferDirectYield()

export const directReturnRules: ReadonlyArray<Rule> = Array.make(
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield
)

const makePreferImplicitReturn = () => {
  const message = "Avoid arrow function block bodies that only return a value."

  const hint =
    "Replace this with an implicit return by removing the return statement and function " +
    "body braces. Wrap object literals in parentheses when needed."

  const preferImplicitReturn = makeRule("prefer-implicit-return")(preferImplicitReturnScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferImplicitReturn
}

export const preferImplicitReturn = makePreferImplicitReturn()

export const implicitReturnRules: ReadonlyArray<Rule> = Array.make(preferImplicitReturn)

const makeNoPassThroughObjectWrappers = () => {
  const message = "Avoid a function that only repackages its parameters for another constructor."

  const hint =
    "Inline the constructor or factory call at each caller. Keep a function only when it adds " +
    "policy, validation, defaults, or behavior."

  const noPassThroughObjectWrappers = makeRule("no-pass-through-object-wrappers")(
    noPassThroughObjectWrappersScanner
  )(fixedRuleMessage(message, hint))

  return noPassThroughObjectWrappers
}

export const noPassThroughObjectWrappers = makeNoPassThroughObjectWrappers()

const makeNoReexports = () => {
  const message = "Do not re-export imported bindings."

  const hint =
    "Import the dependency where it is used and expose a locally defined public interface instead."

  const noReexports = makeRule("no-reexports")(noReexportsScanner)(fixedRuleMessage(message, hint))

  return noReexports
}

export const noReexports = makeNoReexports()

const makeNoValueAliases = () => {
  const message = "Do not declare aliases for existing values."

  const hint =
    "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
    "introduce behavior or constructed data instead of another name for the same value."

  const noValueAliases = makeRule("no-value-aliases")(noValueAliasesScanner)(
    fixedRuleMessage(message, hint)
  )

  return noValueAliases
}

export const noValueAliases = makeNoValueAliases()

export const moduleIdentityRules: ReadonlyArray<Rule> = Array.make(
  noReexports,
  noValueAliases,
  noPassThroughObjectWrappers
)

export const conceptAndCompositionRules: ReadonlyArray<Rule> = pipe(
  directReturnRules,
  Array.appendAll(compositionRules),
  Array.appendAll(implicitReturnRules),
  Array.appendAll(moduleIdentityRules)
)
