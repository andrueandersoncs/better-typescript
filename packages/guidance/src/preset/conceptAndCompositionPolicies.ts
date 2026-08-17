import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { controlFlowMatcherCatalog } from "@better-typescript/matchers/builtins/controlFlowMatcherCatalog"
import { functionalMatcherCatalog } from "@better-typescript/matchers/builtins/functionalMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makePreferComposedCallbacks = () => {
  const message = "Avoid inline callbacks that compose the callback parameter through calls."

  const hint =
    "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
    "the transformation, name the adapter in the nearest scope and pass it by reference."

  const preferComposedCallbacks = makeBuiltinPolicy({
    name: "prefer-composed-callbacks",
    matcher: functionalMatcherCatalog.preferComposedCallbacksMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

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
    match: Match<
      typeof functionalMatcherCatalog.preferEtaReductionMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeEtaFindings = () => makeFindings(match.target, message, etaHint, match.fact)
    const makeFlowFindings = () => makeFindings(match.target, message, flowHint, match.fact)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ style: "eta" }, makeEtaFindings),
      EffectMatch.when({ style: "flow" }, makeFlowFindings),
      EffectMatch.exhaustive
    )
  }

  const preferEtaReduction = makeBuiltinPolicy({
    name: "prefer-eta-reduction",
    matcher: functionalMatcherCatalog.preferEtaReductionMatcher,
    guidance: Function.constant(makePreferEtaReductionFindings),
    reported: true,
    stage: "program"
  })

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

  const adapterHint = (typeText: string, propertyName: string, partialText: string) =>
    `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

  const makePreferFunctionCompositionFindings = (
    match: Match<
      typeof functionalMatcherCatalog.preferFunctionCompositionMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeBlockFindings = () => makeFindings(match.target, blockMessage, blockHint, match.fact)

    const makeAdapterFindings = (
      fact: Extract<
        typeof functionalMatcherCatalog.preferFunctionCompositionMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "adapter" }
      >
    ) => {
      const hint = adapterHint(fact.typeText, fact.propertyName, fact.partialText)

      return makeFindings(match.target, adapterMessage, hint, match.fact)
    }

    const makeEffectPipelineFindings = () =>
      makeFindings(match.target, effectPipelineMessage, effectPipelineHint, match.fact)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "block" }, makeBlockFindings),
      EffectMatch.when({ kind: "adapter" }, makeAdapterFindings),
      EffectMatch.when({ kind: "effect-pipeline" }, makeEffectPipelineFindings),
      EffectMatch.exhaustive
    )
  }

  const preferFunctionComposition = makeBuiltinPolicy({
    name: "prefer-function-composition",
    matcher: functionalMatcherCatalog.preferFunctionCompositionMatcher,
    guidance: Function.constant(makePreferFunctionCompositionFindings),
    reported: true,
    stage: "program"
  })

  return preferFunctionComposition
}

export const preferFunctionComposition = makePreferFunctionComposition()

const makePreferFunctionFlip = () => {
  const message = "Avoid lambdas that only flip the order of a curried application."

  const hint =
    "Reorder the curried parameters so the fixed argument comes first " +
    "(data-last), then pass the partial f(y) directly — or use " +
    "Function.flip(f)(y) instead of (x) => f(x)(y)."

  const preferFunctionFlip = makeBuiltinPolicy({
    name: "prefer-function-flip",
    matcher: functionalMatcherCatalog.preferFunctionFlipMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferFunctionFlip
}

export const preferFunctionFlip = makePreferFunctionFlip()

export const compositionPolicies: ReadonlyArray<Policy> = Array.make(
  preferComposedCallbacks,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip
)

export const makeConceptControlFindings = (
  match: Match<
    typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact> ? Fact : never
  >
) => {
  const emptyRelated = Function.constant("")

  const relatedConcept = (
    fact: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => pipe(Array.get(fact.relatedConcepts, 0), Option.getOrElse(emptyRelated))

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

  const hintForRedundantAlias = (
    alias: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => {
    const existing = relatedConcept(alias)

    return (
      `Use ${existing} directly, merge the concepts, or add a real invariant or independently ` +
      "evolving boundary. Do not keep a second name only to describe structural use."
    )
  }

  const hintFor = (
    fact: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) =>
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

  const relatedAt =
    (
      fact: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    ) =>
    (index: number) =>
      pipe(Array.get(fact.relatedConcepts, index), Option.getOrElse(emptyRelated))

  const messageForClosed = (
    closed: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) =>
    `${closed.concept} and ${closed.owner} form a closed abstraction with at most one external owner.`

  const messageForRedundantAlias = (
    alias: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${alias.concept} renames ${relatedAt(alias)(0)} without adding independent semantics.`

  const messageForDuplicateShape = (
    duplicate: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${duplicate.concept} duplicates the concrete structure of ${relatedAt(duplicate)(0)}.`

  const messageForFunctionDerived = (
    derived: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${derived.concept} is named after its sole function role instead of independent semantics.`

  const messageForSpeculativeExport = (
    speculative: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) =>
    `${speculative.concept} is exported without an independent first-party consumer or established boundary.`

  const messageForUnusedField = (
    unused: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${unused.concept}.${relatedAt(unused)(0)} is constructed but never independently read.`

  const messageForMissingRationale = (
    missing: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${missing.concept} lacks a complete, structurally supported data-structure rationale.`

  const messageForParameterBag = (
    bag: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) => `${bag.concept} is constructed only to cross the ${bag.owner} call seam.`

  const messageForPassThroughConversion = (
    conversion: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) =>
    `${conversion.owner} copies ${relatedAt(conversion)(0)} into ${relatedAt(conversion)(1)} without transformation.`

  const messageFor = (
    fact: typeof functionalMatcherCatalog.conceptControlMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  ) =>
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

  return makeFindings(match.target, message, hint, match.fact)
}

export const conceptControl = makeBuiltinPolicy({
  name: "concept-control",
  matcher: functionalMatcherCatalog.conceptControlMatcher,
  guidance: Function.constant(makeConceptControlFindings),
  reported: true,
  stage: "program"
})

export const conceptControlPolicies: ReadonlyArray<Policy> = Array.make(conceptControl)

const makePreferConditionalReturn = () => {
  const preferConditionalReturnGuidance: Guidance<
    typeof functionalMatcherCatalog.preferConditionalReturnMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof functionalMatcherCatalog.preferConditionalReturnMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(
        match.target,
        "Avoid if statements that only choose between two return values.",
        `Return a conditional expression instead: return ${match.fact.returnText}.`,
        match.fact
      )

  const preferConditionalReturn = makeBuiltinPolicy({
    name: "prefer-conditional-return",
    matcher: functionalMatcherCatalog.preferConditionalReturnMatcher,
    guidance: preferConditionalReturnGuidance,
    reported: true,
    stage: "program"
  })

  return preferConditionalReturn
}

export const preferConditionalReturn = makePreferConditionalReturn()

const makePreferDirectBooleanReturn = () => {
  const andFalseHint =
    "Use && instead of branching to false (`cond && value`). When the false " +
    "branch is the then-arm (`cond ? false : value`), negate the condition into " +
    "a named boolean first so `!` and `&&` are not stacked in one expression."

  const makePreferDirectBooleanReturnFindings = (
    match: Match<
      typeof functionalMatcherCatalog.preferDirectBooleanReturnMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeLiteralBranchFindings = (
      fact: Extract<
        typeof functionalMatcherCatalog.preferDirectBooleanReturnMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "literal-branch" }
      >
    ) => {
      const returnExpression = fact.literalValue
        ? `(${fact.conditionText})`
        : `!(${fact.conditionText})`

      const literalText = String(fact.literalValue)

      return makeFindings(
        match.target,
        `Avoid returning ${literalText} from a conditional branch.`,
        `Use the condition as the boolean value instead: return ${returnExpression}.`,
        match.fact
      )
    }

    const makeAndFalseFindings = () =>
      makeFindings(
        match.target,
        "Avoid conditional return followed by return false.",
        andFalseHint,
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "literal-branch" }, makeLiteralBranchFindings),
      EffectMatch.when({ kind: "and-false" }, makeAndFalseFindings),
      EffectMatch.exhaustive
    )
  }

  const preferDirectBooleanReturn = makeBuiltinPolicy({
    name: "prefer-direct-boolean-return",
    matcher: functionalMatcherCatalog.preferDirectBooleanReturnMatcher,
    guidance: Function.constant(makePreferDirectBooleanReturnFindings),
    reported: true,
    stage: "program"
  })

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

  const preferDirectYield = makeBuiltinPolicy({
    name: "prefer-direct-yield",
    matcher: functionalMatcherCatalog.preferDirectYieldMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferDirectYield
}

export const preferDirectYield = makePreferDirectYield()

export const directReturnPolicies: ReadonlyArray<Policy> = Array.make(
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield
)

const makePreferImplicitReturn = () => {
  const message = "Avoid arrow function block bodies that only return a value."

  const hint =
    "Replace this with an implicit return by removing the return statement and function " +
    "body braces. Wrap object literals in parentheses when needed."

  const preferImplicitReturn = makeBuiltinPolicy({
    name: "prefer-implicit-return",
    matcher: controlFlowMatcherCatalog.preferImplicitReturnMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferImplicitReturn
}

export const preferImplicitReturn = makePreferImplicitReturn()

export const implicitReturnPolicies: ReadonlyArray<Policy> = Array.make(preferImplicitReturn)

const makeNoPassThroughObjectWrappers = () => {
  const message = "Avoid a function that only repackages its parameters for another constructor."

  const hint =
    "Inline the constructor or factory call at each caller. Keep a function only when it adds " +
    "policy, validation, defaults, or behavior."

  const noPassThroughObjectWrappers = makeBuiltinPolicy({
    name: "no-pass-through-object-wrappers",
    matcher: functionalMatcherCatalog.noPassThroughObjectWrappersMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noPassThroughObjectWrappers
}

export const noPassThroughObjectWrappers = makeNoPassThroughObjectWrappers()

const makeNoReexports = () => {
  const message = "Do not re-export imported bindings."

  const hint =
    "Import the dependency where it is used and expose a locally defined public interface instead."

  const noReexports = makeBuiltinPolicy({
    name: "no-reexports",
    matcher: functionalMatcherCatalog.noReexportsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noReexports
}

export const noReexports = makeNoReexports()

const makeNoValueAliases = () => {
  const message = "Do not declare aliases for existing values."

  const hint =
    "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
    "introduce behavior or constructed data instead of another name for the same value."

  const noValueAliases = makeBuiltinPolicy({
    name: "no-value-aliases",
    matcher: functionalMatcherCatalog.noValueAliasesMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noValueAliases
}

export const noValueAliases = makeNoValueAliases()

export const moduleIdentityPolicies: ReadonlyArray<Policy> = Array.make(
  noReexports,
  noValueAliases,
  noPassThroughObjectWrappers
)

// Member order is pinned because concatenated categories define the public report block order.
export const conceptAndCompositionPolicies: ReadonlyArray<Policy> = pipe(
  conceptControlPolicies,
  Array.appendAll(directReturnPolicies),
  Array.appendAll(compositionPolicies),
  Array.appendAll(implicitReturnPolicies),
  Array.appendAll(moduleIdentityPolicies)
)
