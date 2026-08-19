import { closedAbstraction } from "../builtins/concepts/closedAbstractionRule.js"
import { duplicateShape } from "../builtins/concepts/duplicateShapeRule.js"
import { functionDerivedModel } from "../builtins/concepts/functionDerivedModelRule.js"
import { missingRationale } from "../builtins/concepts/missingRationaleRule.js"
import { parameterBag } from "../builtins/concepts/parameterBagRule.js"
import { passThroughConversion } from "../builtins/concepts/passThroughConversionRule.js"
import { redundantAlias } from "../builtins/concepts/redundantAliasRule.js"
import { speculativeExport } from "../builtins/concepts/speculativeExportRule.js"
import { unusedField } from "../builtins/concepts/unusedFieldRule.js"
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
import { Array, Function, pipe, Match as EffectMatch } from "effect"
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

const conceptRules: ReadonlyArray<Rule> = Array.make(
  closedAbstraction,
  duplicateShape,
  functionDerivedModel,
  missingRationale,
  parameterBag,
  passThroughConversion,
  redundantAlias,
  speculativeExport,
  unusedField
)

export const conceptAndCompositionRules: ReadonlyArray<Rule> = pipe(
  directReturnRules,
  Array.appendAll(compositionRules),
  Array.appendAll(implicitReturnRules),
  Array.appendAll(moduleIdentityRules),
  Array.appendAll(conceptRules)
)
