import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import * as path from "node:path"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import type { NamedDetection } from "@better-typescript/core/engine/derive/namedDetection"
import { filterFallbackAdviceForUncoveredFiles } from "@better-typescript/core/engine/fileLevelAdvice"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import type { Signal } from "@better-typescript/core/engine/signal/data"
import { signalOf } from "@better-typescript/core/engine/signal/signal"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { commentLayoutMatcherCatalog } from "@better-typescript/matchers/builtins/commentLayoutMatcherCatalog"
import { controlFlowMatcherCatalog } from "@better-typescript/matchers/builtins/controlFlowMatcherCatalog"
import { dataModelMatcherCatalog } from "@better-typescript/matchers/builtins/dataModelMatcherCatalog"
import { effectCollectionsMatcherCatalog } from "@better-typescript/matchers/builtins/effectCollectionsMatcherCatalog"
import { effectFunctionsAndSchemasMatcherCatalog } from "@better-typescript/matchers/builtins/effectFunctionsAndSchemasMatcherCatalog"
import { functionalMatcherCatalog } from "@better-typescript/matchers/builtins/functionalMatcherCatalog"
import { mutationQualityMatcherCatalog } from "@better-typescript/matchers/builtins/mutationQualityMatcherCatalog"
import { namingMatcherCatalog } from "@better-typescript/matchers/builtins/namingMatcherCatalog"
import { safetyMatcherCatalog } from "@better-typescript/matchers/builtins/safetyMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { conceptProliferation } from "../conceptControl/conceptProliferation.js"
import { highSignalDensity } from "../derive/highSignalDensity.js"
import { ruleDominance } from "../derive/ruleDominance.js"
import { sideEffectLaundering } from "../derive/sideEffectLaundering.js"
import { hotSubsystem } from "../hotSubsystem/hotSubsystem.js"
import { ImperativeStateSignals } from "../imperativeStateManager/data.js"
import { imperativeStateManager } from "../imperativeStateManager/imperativeStateManager.js"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { makeSilentBuiltinPolicy } from "../makeSilentBuiltinPolicy.js"
import { PipelineSignals } from "../pipelineHostile/data.js"
import { pipelineHostile } from "../pipelineHostile/pipelineHostile.js"
import { factGuidance } from "../policyGuidance.js"
import { SystemicSignals } from "../systemicHotspots/data.js"
import { systemicHotspots } from "../systemicHotspots/systemicHotspots.js"
import { defaultNamedElements } from "./defaultNamedElements.js"

const makeNoMultiLineComments = () => {
  const message = "Avoid multi-line comments."

  const hint =
    "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
    "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
    "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
    "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
    "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
    "markdown file in the adrs/ directory instead."

  const noMultiLineComments = makeBuiltinPolicy(
    "no-multi-line-comments",
    commentLayoutMatcherCatalog.noMultiLineCommentsMatcher,
    factGuidance(message, hint)
  )

  return noMultiLineComments
}

export const noMultiLineComments = makeNoMultiLineComments()

const makeRequireBecauseInComments = () => {
  const message = 'Comments must include the word "because".'

  const hint =
    "Delete comments that only restate what the code does. Otherwise, explain why the " +
    'code or approach is necessary using the word "because". Every comment carries this ' +
    "obligation; there are no exempt comment forms."

  const requireBecauseInComments = makeBuiltinPolicy(
    "require-because-in-comments",
    commentLayoutMatcherCatalog.requireBecauseInCommentsMatcher,
    factGuidance(message, hint)
  )

  return requireBecauseInComments
}

export const requireBecauseInComments = makeRequireBecauseInComments()

const makeNoLongComments = () => {
  const message = "Comments must be at most 100 characters."

  const hint =
    "Keep each comment within 100 characters because longer comments stop reading as code " +
    "annotations. State the single load-bearing reason; move longer explanations into an " +
    "Architectural Decision Record (ADR) in the adrs/ directory instead."

  const noLongComments = makeBuiltinPolicy(
    "no-long-comments",
    commentLayoutMatcherCatalog.noLongCommentsMatcher,
    factGuidance(message, hint)
  )

  return noLongComments
}

export const noLongComments = makeNoLongComments()

export const commentPolicies: ReadonlyArray<Policy> = Array.make(
  noMultiLineComments,
  requireBecauseInComments,
  noLongComments
)

const makeRequireBlankLinesAroundMultilineDeclarations = () => {
  const message = "Multi-line declarations must have a blank line above and below."

  const hint =
    "Insert an empty line before and after this declaration so its multi-line shape " +
    "is visually separated from neighboring statements. Single-line declarations do " +
    "not need surrounding blank lines; the first and last statements in a block are " +
    "exempt on the outer sides."

  const requireBlankLinesAroundMultilineDeclarations = makeBuiltinPolicy(
    "require-blank-lines-around-multiline-declarations",
    commentLayoutMatcherCatalog.requireBlankLinesAroundMultilineDeclarationsMatcher,
    factGuidance(message, hint)
  )

  return requireBlankLinesAroundMultilineDeclarations
}

export const requireBlankLinesAroundMultilineDeclarations =
  makeRequireBlankLinesAroundMultilineDeclarations()

const makeNoBlankLinesBetweenSingleLineDeclarations = () => {
  const message = "Single-line declarations must not have blank lines between them."

  const hint =
    "Remove the empty line between these adjacent single-line declarations so they " +
    "stay contiguous. Blank lines remain required around multi-line declarations; " +
    "keep those separators when a neighbor is multi-line."

  const noBlankLinesBetweenSingleLineDeclarations = makeBuiltinPolicy(
    "no-blank-lines-between-single-line-declarations",
    commentLayoutMatcherCatalog.noBlankLinesBetweenSingleLineDeclarationsMatcher,
    factGuidance(message, hint)
  )

  return noBlankLinesBetweenSingleLineDeclarations
}

export const noBlankLinesBetweenSingleLineDeclarations =
  makeNoBlankLinesBetweenSingleLineDeclarations()

export const declarationSpacingPolicies: ReadonlyArray<Policy> = Array.make(
  requireBlankLinesAroundMultilineDeclarations,
  noBlankLinesBetweenSingleLineDeclarations
)

const makePreferInferredTypes = () => {
  const makePreferInferredTypesFindings = (
    match: Match<
      typeof functionalMatcherCatalog.preferInferredTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const messages = {
      const: "Avoid a const annotation when its initializer infers the same type.",
      return: "Avoid a return annotation when the function body infers the same type.",
      contextual: "Avoid annotations on a contextually typed function."
    } as const satisfies Record<
      (typeof functionalMatcherCatalog.preferInferredTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never)["kind"],
      string
    >

    const hints = {
      const:
        "Delete the type annotation. Keep annotations that widen a value or guide generic inference.",
      return:
        "Delete the return type annotation. Keep explicit contracts when inference changes the signature.",
      contextual:
        "Delete the parameter and return annotations together; the surrounding expression supplies them."
    } as const satisfies Record<
      (typeof functionalMatcherCatalog.preferInferredTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never)["kind"],
      string
    >

    const message = messages[match.fact.kind]
    const hint = hints[match.fact.kind]

    return makeFindings(match.target, message, hint, match.fact)
  }

  const preferInferredTypes = makeBuiltinPolicy(
    "prefer-inferred-types",
    functionalMatcherCatalog.preferInferredTypesMatcher,
    Function.constant(makePreferInferredTypesFindings)
  )

  return preferInferredTypes
}

export const preferInferredTypes = makePreferInferredTypes()

export const inferredTypePolicies: ReadonlyArray<Policy> = Array.of(preferInferredTypes)

// Category concatenation order is pinned because report block order is a public contract.
export const commentAndDeclarationPolicies: ReadonlyArray<Policy> = pipe(
  commentPolicies,
  Array.appendAll(inferredTypePolicies),
  Array.appendAll(declarationSpacingPolicies)
)

const makePreferComposedCallbacks = () => {
  const message = "Avoid inline callbacks that compose the callback parameter through calls."

  const hint =
    "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
    "the transformation, name the adapter in the nearest scope and pass it by reference."

  const preferComposedCallbacks = makeBuiltinPolicy(
    "prefer-composed-callbacks",
    functionalMatcherCatalog.preferComposedCallbacksMatcher,
    factGuidance(message, hint)
  )

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

  const preferEtaReduction = makeBuiltinPolicy(
    "prefer-eta-reduction",
    functionalMatcherCatalog.preferEtaReductionMatcher,
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

  const preferFunctionComposition = makeBuiltinPolicy(
    "prefer-function-composition",
    functionalMatcherCatalog.preferFunctionCompositionMatcher,
    Function.constant(makePreferFunctionCompositionFindings)
  )

  return preferFunctionComposition
}

export const preferFunctionComposition = makePreferFunctionComposition()

const makePreferFunctionFlip = () => {
  const message = "Avoid lambdas that only flip the order of a curried application."

  const hint =
    "Reorder the curried parameters so the fixed argument comes first " +
    "(data-last), then pass the partial f(y) directly — or use " +
    "Function.flip(f)(y) instead of (x) => f(x)(y)."

  const preferFunctionFlip = makeBuiltinPolicy(
    "prefer-function-flip",
    functionalMatcherCatalog.preferFunctionFlipMatcher,
    factGuidance(message, hint)
  )

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

export const conceptControl = makeBuiltinPolicy(
  "concept-control",
  functionalMatcherCatalog.conceptControlMatcher,
  Function.constant(makeConceptControlFindings)
)

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

  const preferConditionalReturn = makeBuiltinPolicy(
    "prefer-conditional-return",
    functionalMatcherCatalog.preferConditionalReturnMatcher,
    preferConditionalReturnGuidance
  )

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

  const preferDirectBooleanReturn = makeBuiltinPolicy(
    "prefer-direct-boolean-return",
    functionalMatcherCatalog.preferDirectBooleanReturnMatcher,
    Function.constant(makePreferDirectBooleanReturnFindings)
  )

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

  const preferDirectYield = makeBuiltinPolicy(
    "prefer-direct-yield",
    functionalMatcherCatalog.preferDirectYieldMatcher,
    factGuidance(message, hint)
  )

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

  const preferImplicitReturn = makeBuiltinPolicy(
    "prefer-implicit-return",
    controlFlowMatcherCatalog.preferImplicitReturnMatcher,
    factGuidance(message, hint)
  )

  return preferImplicitReturn
}

export const preferImplicitReturn = makePreferImplicitReturn()

export const implicitReturnPolicies: ReadonlyArray<Policy> = Array.make(preferImplicitReturn)

const makeNoPassThroughObjectWrappers = () => {
  const message = "Avoid a function that only repackages its parameters for another constructor."

  const hint =
    "Inline the constructor or factory call at each caller. Keep a function only when it adds " +
    "policy, validation, defaults, or behavior."

  const noPassThroughObjectWrappers = makeBuiltinPolicy(
    "no-pass-through-object-wrappers",
    functionalMatcherCatalog.noPassThroughObjectWrappersMatcher,
    factGuidance(message, hint)
  )

  return noPassThroughObjectWrappers
}

export const noPassThroughObjectWrappers = makeNoPassThroughObjectWrappers()

const makeNoReexports = () => {
  const message = "Do not re-export imported bindings."

  const hint =
    "Import the dependency where it is used and expose a locally defined public interface instead."

  const noReexports = makeBuiltinPolicy(
    "no-reexports",
    functionalMatcherCatalog.noReexportsMatcher,
    factGuidance(message, hint)
  )

  return noReexports
}

export const noReexports = makeNoReexports()

const makeNoValueAliases = () => {
  const message = "Do not declare aliases for existing values."

  const hint =
    "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
    "introduce behavior or constructed data instead of another name for the same value."

  const noValueAliases = makeBuiltinPolicy(
    "no-value-aliases",
    functionalMatcherCatalog.noValueAliasesMatcher,
    factGuidance(message, hint)
  )

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

const makeNoArraySpread = () => {
  const message = "Avoid the array-spread operator when constructing arrays."

  const hint =
    "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
    "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
    "and Array.fromIterable to materialize an iterable."

  const noArraySpread = makeBuiltinPolicy(
    "no-array-spread",
    controlFlowMatcherCatalog.noArraySpreadMatcher,
    factGuidance(message, hint)
  )

  return noArraySpread
}

export const noArraySpread = makeNoArraySpread()

const makeNoPrimitiveArrayConstructors = () => {
  const message = "Avoid primitive Array constructors."

  const hint =
    "Use Effect's Array module instead — Array.empty() for an empty array, " +
    "Array.of(value) or Array.make(...) for elements, Array.allocate(n) for a " +
    "fixed length, and Array.fromIterable for an iterable."

  const noPrimitiveArrayConstructors = makeBuiltinPolicy(
    "no-primitive-array-constructors",
    controlFlowMatcherCatalog.noPrimitiveArrayConstructorsMatcher,
    factGuidance(message, hint)
  )

  return noPrimitiveArrayConstructors
}

export const noPrimitiveArrayConstructors = makeNoPrimitiveArrayConstructors()

export const arrayConstructionPolicies: ReadonlyArray<Policy> = Array.make(
  noArraySpread,
  noPrimitiveArrayConstructors
)

const makeNoCallbacks = () => {
  const message = "Avoid callback-style functions that accept a function argument and return void."

  const hint =
    "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
    "own API as an Effect-returning function from the start. Ambient declarations " +
    "(declare statements) describing a third-party API are permitted."

  const noCallbacks = makeBuiltinPolicy(
    "no-callbacks",
    controlFlowMatcherCatalog.noCallbacksMatcher,
    factGuidance(message, hint)
  )

  return noCallbacks
}

export const noCallbacks = makeNoCallbacks()

const makeNoAsyncFunctions = () => {
  const message = "Avoid declaring functions as async."

  const hint =
    "Model asynchronous work with Effect instead of async/await. To integrate with a " +
    "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
    "outgoing Promise-returning callback contract with a non-async function that " +
    "returns Effect.runPromise(effect)."

  const noAsyncFunctions = makeBuiltinPolicy(
    "no-async-functions",
    controlFlowMatcherCatalog.noAsyncFunctionsMatcher,
    factGuidance(message, hint)
  )

  return noAsyncFunctions
}

export const noAsyncFunctions = makeNoAsyncFunctions()

export const asynchronousFunctionPolicies: ReadonlyArray<Policy> = Array.make(
  noCallbacks,
  noAsyncFunctions
)

const makeNoSwitchStatements = () => {
  const message = "Avoid switch statements."

  const hint =
    "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
    "so every case is handled explicitly."

  const noSwitchStatements = makeBuiltinPolicy(
    "no-switch-statements",
    controlFlowMatcherCatalog.noSwitchStatementsMatcher,
    factGuidance(message, hint)
  )

  return noSwitchStatements
}

export const noSwitchStatements = makeNoSwitchStatements()

const makeNoFunctionKeyword = () => {
  const message = "Avoid using the function keyword."

  const hint =
    "Declare this function as a const using fat-arrow syntax instead. Keep function " +
    "declarations only when overload signatures are required, and keep function* when " +
    "generator semantics are required."

  const noFunctionKeyword = makeBuiltinPolicy(
    "no-function-keyword",
    controlFlowMatcherCatalog.noFunctionKeywordMatcher,
    factGuidance(message, hint)
  )

  return noFunctionKeyword
}

export const noFunctionKeyword = makeNoFunctionKeyword()

const makeNoInlineClosures = () => {
  const message =
    "Avoid arrow functions outside naming, currying, and third-party callback positions."

  const hint =
    "Name this function as a top-level const and pass it by reference, currying it when it " +
    "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
    "to third-party functions (effect combinators, node_modules callbacks). When the " +
    "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
    "over nesting functions."

  const noInlineClosures = makeBuiltinPolicy(
    "no-inline-closures",
    controlFlowMatcherCatalog.noInlineClosuresMatcher,
    factGuidance(message, hint)
  )

  return noInlineClosures
}

export const noInlineClosures = makeNoInlineClosures()

const makeNoNestedCalls = () => {
  const ruleHint =
    "A call whose result feeds another call hides a sequence of steps in one expression " +
    "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
    "gen block) and pass the name, or restructure data-last so the value flows through " +
    "pipe. Calls that return functions stay inline: currying and pipe stages read " +
    "left-to-right."

  const noNestedCallsGuidance: Guidance<
    typeof controlFlowMatcherCatalog.noNestedCallsMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof controlFlowMatcherCatalog.noNestedCallsMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(
        match.target,
        `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
        ruleHint,
        match.fact
      )

  const noNestedCalls = makeBuiltinPolicy(
    "no-nested-calls",
    controlFlowMatcherCatalog.noNestedCallsMatcher,
    noNestedCallsGuidance
  )

  return noNestedCalls
}

export const noNestedCalls = makeNoNestedCalls()

export const declarativeControlPolicies: ReadonlyArray<Policy> = Array.make(
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls
)

const makeNoForInLoops = () => {
  const message = "Avoid imperative logic in for..in loops."

  const hint =
    "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
    "or Record.toEntries(), instead."

  const noForInLoops = makeBuiltinPolicy(
    "no-for-in-loops",
    controlFlowMatcherCatalog.noForInLoopsMatcher,
    factGuidance(message, hint)
  )

  return noForInLoops
}

export const noForInLoops = makeNoForInLoops()

const makeNoForLoops = () => {
  const message = "Avoid imperative logic in iterator-based for loops."

  const hint =
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead."

  const noForLoops = makeBuiltinPolicy(
    "no-for-loops",
    controlFlowMatcherCatalog.noForLoopsMatcher,
    factGuidance(message, hint)
  )

  return noForLoops
}

export const noForLoops = makeNoForLoops()

const makeNoForOfLoops = () => {
  const synchronousHint =
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead."

  const asynchronousHint =
    "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
    "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

  const noForOfLoopsGuidance: Guidance<
    typeof controlFlowMatcherCatalog.noForOfLoopsMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof controlFlowMatcherCatalog.noForOfLoopsMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(
        match.target,
        "Avoid imperative logic in for..of loops.",
        match.fact.isAsync ? asynchronousHint : synchronousHint,
        match.fact
      )

  const noForOfLoops = makeBuiltinPolicy(
    "no-for-of-loops",
    controlFlowMatcherCatalog.noForOfLoopsMatcher,
    noForOfLoopsGuidance
  )

  return noForOfLoops
}

export const noForOfLoops = makeNoForOfLoops()

export const imperativeLoopPolicies: ReadonlyArray<Policy> = Array.make(
  noForInLoops,
  noForLoops,
  noForOfLoops
)

// Member order is pinned because concatenated categories define the public report block order.
export const controlFlowPolicies: ReadonlyArray<Policy> = pipe(
  Array.make(
    asynchronousFunctionPolicies,
    arrayConstructionPolicies,
    imperativeLoopPolicies,
    declarativeControlPolicies
  ),
  Array.flatten
)

const makePreferHashMap = () => {
  const constructorMessage = "Avoid constructing a built-in Map."

  const constructorHint =
    'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
    "HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For " +
    "reference-identity object keys, wrap each key in an Equal.equal value that compares the " +
    "underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing " +
    "a Map is permitted only when it is handed to a third-party API that requires one."

  const typeRefHint =
    "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with structural " +
    "equality by default. For reference-identity object keys, use an Equal.equal wrapper whose " +
    "equality compares the underlying objects with === and whose Hash.symbol method returns " +
    "Hash.random(object). Writing the built-in Map type is permitted only where it mirrors a " +
    "third-party contract: ambient declarations and values that cross into a third-party call."

  const mutableHashMapMessage = "Avoid Effect's MutableHashMap."

  const mutableHashMapHint =
    "Use Effect's immutable HashMap instead. Build a HashMap with HashMap.empty(), " +
    "HashMap.make(), or HashMap.fromIterable(), and return the value from HashMap.set() " +
    "when updating it."

  const emptyTypeName = ""
  const emptyTypeNameFallback = Function.constant(emptyTypeName)

  const makePreferHashMapFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.preferHashMapMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) => {
    const makeConstructorFindings = () =>
      makeFindings(match.target, constructorMessage, constructorHint, undefined)

    const makeMutableFindings = () =>
      makeFindings(match.target, mutableHashMapMessage, mutableHashMapHint, undefined)

    const makeTypeRefFindings = (
      fact: typeof dataModelMatcherCatalog.preferHashMapMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    ) => {
      const name = pipe(
        Option.fromNullishOr(fact.typeName),
        Option.getOrElse(emptyTypeNameFallback)
      )

      return makeFindings(match.target, `Avoid the built-in ${name} type.`, typeRefHint, undefined)
    }

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "constructor" }, makeConstructorFindings),
      EffectMatch.when({ kind: "mutable" }, makeMutableFindings),
      EffectMatch.when({ kind: "type-ref" }, makeTypeRefFindings),
      EffectMatch.exhaustive
    )
  }

  const preferHashMap = makeBuiltinPolicy(
    "prefer-hash-map",
    dataModelMatcherCatalog.preferHashMapMatcher,
    Function.constant(makePreferHashMapFindings)
  )

  return preferHashMap
}

export const preferHashMap = makePreferHashMap()

const makePreferHashSet = () => {
  const constructorMessage = "Avoid constructing a built-in Set."

  const constructorHint =
    "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
    "HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For " +
    "reference-identity object members, wrap each value in an Equal.equal value that compares " +
    "the underlying objects with === and returns Hash.random(object) from Hash.symbol. " +
    "Constructing a Set is permitted only when it is handed to a third-party API that requires one."

  const typeRefHint =
    "Use HashSet.HashSet<T> from Effect instead. HashSet uses Equal and Hash with structural " +
    "equality by default. For reference-identity object members, use an Equal.equal wrapper whose " +
    "equality compares the underlying objects with === and whose Hash.symbol method returns " +
    "Hash.random(object). Writing the built-in Set type is permitted only where it mirrors a " +
    "third-party contract: ambient declarations and values that cross into a third-party call."

  const mutableHashSetMessage = "Avoid Effect's MutableHashSet."

  const mutableHashSetHint =
    "Use Effect's immutable HashSet instead. Build a HashSet with HashSet.empty(), " +
    "HashSet.make(), or HashSet.fromIterable(), and return the value from HashSet.add() " +
    "when updating it."

  const emptyTypeName = ""
  const emptyTypeNameFallback = Function.constant(emptyTypeName)

  const makePreferHashSetFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.preferHashSetMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) => {
    const makeConstructorFindings = () =>
      makeFindings(match.target, constructorMessage, constructorHint, undefined)

    const makeMutableFindings = () =>
      makeFindings(match.target, mutableHashSetMessage, mutableHashSetHint, undefined)

    const makeTypeRefFindings = (
      fact: typeof dataModelMatcherCatalog.preferHashSetMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    ) => {
      const name = pipe(
        Option.fromNullishOr(fact.typeName),
        Option.getOrElse(emptyTypeNameFallback)
      )

      return makeFindings(match.target, `Avoid the built-in ${name} type.`, typeRefHint, undefined)
    }

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "constructor" }, makeConstructorFindings),
      EffectMatch.when({ kind: "mutable" }, makeMutableFindings),
      EffectMatch.when({ kind: "type-ref" }, makeTypeRefFindings),
      EffectMatch.exhaustive
    )
  }

  const preferHashSet = makeBuiltinPolicy(
    "prefer-hash-set",
    dataModelMatcherCatalog.preferHashSetMatcher,
    Function.constant(makePreferHashSetFindings)
  )

  return preferHashSet
}

export const preferHashSet = makePreferHashSet()

export const hashCollectionPolicies: ReadonlyArray<Policy> = Array.make(
  preferHashSet,
  preferHashMap
)

const makePreferCurriedDataLastFunctions = () => {
  const message = "Avoid rest parameters and multiple runtime parameters in one function."

  const hint =
    "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

  const preferCurriedDataLastFunctions = makeSilentBuiltinPolicy(
    "prefer-curried-data-last-functions",
    dataModelMatcherCatalog.preferCurriedDataLastFunctionsMatcher,
    factGuidance(message, hint)
  )

  return preferCurriedDataLastFunctions
}

export const preferCurriedDataLastFunctions = makePreferCurriedDataLastFunctions()

const makePreferOptionMatch = () => {
  const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

  const hint =
    "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
    "instead of manually checking and accessing .value."

  const preferOptionMatch = makeBuiltinPolicy(
    "prefer-option-match",
    dataModelMatcherCatalog.preferOptionMatchMatcher,
    factGuidance(message, hint)
  )

  return preferOptionMatch
}

export const preferOptionMatch = makePreferOptionMatch()

const makePreferPipePolicy = () => {
  const message = "Avoid calling .pipe() as a method."

  const hint =
    'Import pipe from "effect" and call it as a standalone function: ' +
    "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

  const preferPipeFunction = makeBuiltinPolicy(
    "prefer-pipe-function",
    dataModelMatcherCatalog.preferPipeFunctionMatcher,
    factGuidance(message, hint)
  )

  return preferPipeFunction
}

export const preferPipeFunction = makePreferPipePolicy()

export const pipelinePolicies: ReadonlyArray<Policy> = Array.make(
  preferOptionMatch,
  preferPipeFunction,
  preferCurriedDataLastFunctions
)

const makeNoFirstPartySchemaDeclare = () => {
  const schemaDeclareHint =
    "Schema.declare is for third-party integrations and non-parametric opaque or branded types " +
    "validated by a type guard. For structural models you own, define a Schema.Struct plus a " +
    "same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); " +
    "export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you " +
    "validation, encoding, and decoding for free."

  const makeNoFirstPartySchemaDeclareFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noFirstPartySchemaDeclareMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid Schema.declare for the first-party structural type "${match.fact.typeName}".`,
      schemaDeclareHint,
      undefined
    )

  const noFirstPartySchemaDeclare = makeBuiltinPolicy(
    "no-first-party-schema-declare",
    dataModelMatcherCatalog.noFirstPartySchemaDeclareMatcher,
    Function.constant(makeNoFirstPartySchemaDeclareFindings)
  )

  return noFirstPartySchemaDeclare
}

export const noFirstPartySchemaDeclare = makeNoFirstPartySchemaDeclare()

const makeNoInstanceof = () => {
  const hint =
    "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
    "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
    "constructor semantics, so it does not make a class check structural or cross-realm safe."

  const makeNoInstanceofFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noInstanceofMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid instanceof for the first-party class "${match.fact.className}".`,
      hint,
      undefined
    )

  const noInstanceof = makeBuiltinPolicy(
    "no-instanceof",
    dataModelMatcherCatalog.noInstanceofMatcher,
    Function.constant(makeNoInstanceofFindings)
  )

  return noInstanceof
}

export const noInstanceof = makeNoInstanceof()

const makeNoManualTypeDispatch = () => {
  const message = "Avoid dispatching on a value with a chain of if statements that each return."

  const hint =
    "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
    "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
    "error rather than a silent fall-through."

  const noManualTypeDispatch = makeBuiltinPolicy(
    "no-manual-type-dispatch",
    dataModelMatcherCatalog.noManualTypeDispatchMatcher,
    factGuidance(message, hint)
  )

  return noManualTypeDispatch
}

export const noManualTypeDispatch = makeNoManualTypeDispatch()

const makeNoMonomorphicStructGet = () => {
  const message = "Avoid monomorphizing Struct.get at its declaration."

  const hint =
    "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
    "domain type on the consuming value or result rather than on the getter."

  const noMonomorphicStructGet = makeBuiltinPolicy(
    "no-monomorphic-struct-get",
    dataModelMatcherCatalog.noMonomorphicStructGetMatcher,
    factGuidance(message, hint)
  )

  return noMonomorphicStructGet
}

export const noMonomorphicStructGet = makeNoMonomorphicStructGet()

const makeNoRawObjectTypes = () => {
  const parameterMessage = "Parameter uses an anonymous object type instead of a named type."

  const parameterHint =
    "Reuse a named data structure that already expresses this value's semantics. " +
    "If none exists, reconsider whether this function is a real abstraction or a " +
    "procedural seam that should be collapsed into its owner. Introduce a new model " +
    "only when the data has meaning independent of this parameter list; never replace " +
    "it with another anonymous object type."

  const returnMessage = "Return type uses an anonymous object type instead of a named type."

  const returnHint =
    "Define a named type or interface that describes the data's domain meaning — " +
    "for example UserProfile instead of { name: string, age: number }. " +
    "Name the type after what the data represents, not its structural role " +
    "(avoid names like FooResult or BarResponse)."

  const makeNoRawObjectTypesFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noRawObjectTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeParameterFindings = () =>
      makeFindings(match.target, parameterMessage, parameterHint, undefined)

    const makeReturnFindings = () =>
      makeFindings(match.target, returnMessage, returnHint, undefined)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "parameter" }, makeParameterFindings),
      EffectMatch.when({ kind: "return" }, makeReturnFindings),
      EffectMatch.exhaustive
    )
  }

  const noRawObjectTypes = makeBuiltinPolicy(
    "no-raw-object-types",
    dataModelMatcherCatalog.noRawObjectTypesMatcher,
    Function.constant(makeNoRawObjectTypesFindings)
  )

  return noRawObjectTypes
}

export const noRawObjectTypes = makeNoRawObjectTypes()

export const structuralDispatchPolicies: ReadonlyArray<Policy> = Array.make(
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noRawObjectTypes,
  noFirstPartySchemaDeclare,
  noInstanceof
)

// Member order is pinned because concatenated categories define the public report block order.
export const dispatchAndCollectionPolicies: ReadonlyArray<Policy> = pipe(
  structuralDispatchPolicies,
  Array.appendAll(hashCollectionPolicies),
  Array.appendAll(pipelinePolicies)
)

const makePreferEffectArray = () => {
  const hint =
    "Prefer Effect's Array module — define the array as a const and call " +
    "Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), " +
    "or the matching Array.* helper — instead of invoking Array.prototype methods " +
    "directly on array values."

  const preferEffectArrayGuidance: Guidance<
    typeof effectCollectionsMatcherCatalog.preferEffectArrayMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectCollectionsMatcherCatalog.preferEffectArrayMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(match.target, `Avoid Array.prototype.${match.fact.method}().`, hint, match.fact)

  const preferEffectArray = makeBuiltinPolicy(
    "prefer-effect-array",
    effectCollectionsMatcherCatalog.preferEffectArrayMatcher,
    preferEffectArrayGuidance
  )

  return preferEffectArray
}

export const preferEffectArray = makePreferEffectArray()

const makePreferEffectArrayAppendAll = () => {
  const message = "Avoid conditional array spreads."

  const hint =
    "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
    "expression that chooses between an array and an empty array literal."

  const preferEffectArrayAppendAll = makeBuiltinPolicy(
    "prefer-effect-array-append-all",
    effectCollectionsMatcherCatalog.preferEffectArrayAppendAllMatcher,
    factGuidance(message, hint)
  )

  return preferEffectArrayAppendAll
}

export const preferEffectArrayAppendAll = makePreferEffectArrayAppendAll()

const makePreferEffectArrayCountBy = () => {
  const message = "Avoid filtering an array only to count matching elements."

  const hint =
    "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
    "Effect. Remove a surrounding helper when that is its only behavior."

  const preferEffectArrayCountBy = makeBuiltinPolicy(
    "prefer-effect-array-count-by",
    effectCollectionsMatcherCatalog.preferEffectArrayCountByMatcher,
    factGuidance(message, hint)
  )

  return preferEffectArrayCountBy
}

export const preferEffectArrayCountBy = makePreferEffectArrayCountBy()

const makePreferEffectIndexAccess = () => {
  const hint =
    "Use Array.get(collection, index) to represent a potentially absent array element, " +
    "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
    "use Tuple.get(tuple, index) to preserve its positional type."

  const message = "Avoid direct array and tuple index access."

  const preferEffectIndexAccess = makeBuiltinPolicy(
    "prefer-effect-index-access",
    effectCollectionsMatcherCatalog.preferEffectIndexAccessMatcher,
    factGuidance(message, hint)
  )

  return preferEffectIndexAccess
}

export const preferEffectIndexAccess = makePreferEffectIndexAccess()

const makePreferEffectRecordFilterMap = () => {
  const message = "Avoid conditional object spreads."

  const hint =
    "Build a record of candidate properties and use Record.filterMap from Effect with " +
    "Result.succeed/Result.fail (or Result.fromNullishOr) to keep only present entries."

  const preferEffectRecordFilterMap = makeBuiltinPolicy(
    "prefer-effect-record-filter-map",
    effectCollectionsMatcherCatalog.preferEffectRecordFilterMapMatcher,
    factGuidance(message, hint)
  )

  return preferEffectRecordFilterMap
}

export const preferEffectRecordFilterMap = makePreferEffectRecordFilterMap()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectCollectionPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy,
  preferEffectIndexAccess
)

const makePreferEquivalenceStrictEqual = () => {
  const message = "Avoid raw strict equality (===)."

  const hint =
    "Import Equivalence from effect and replace this comparison with " +
    "Equivalence.strictEqual<YourType>()(left, right)."

  const preferEquivalenceStrictEqual = makeBuiltinPolicy(
    "prefer-equivalence-strict-equal",
    effectCollectionsMatcherCatalog.preferEquivalenceStrictEqualMatcher,
    factGuidance(message, hint)
  )

  return preferEquivalenceStrictEqual
}

export const preferEquivalenceStrictEqual = makePreferEquivalenceStrictEqual()

export const equivalencePolicies: ReadonlyArray<Policy> = Array.make(preferEquivalenceStrictEqual)

const makePreferEffectFn = () => {
  const ordinaryHint = (functionName: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
    "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
    "traced span."

  const selfBoundHint = (functionName: string, selfBinding: string, thisType: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
    `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
    "and runs every call inside a traced span."

  const defaultThisType = "..."
  const defaultThisTypeFallback = Function.constant(defaultThisType)

  const makePreferEffectFnFindings = (
    match: Match<
      typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFnMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const { functionName } = match.fact
    const selfBinding = Option.fromNullishOr(match.fact.selfBindingText)

    const thisType = pipe(
      Option.fromNullishOr(match.fact.thisTypeText),
      Option.getOrElse(defaultThisTypeFallback)
    )

    const ordinaryHintForName = () => ordinaryHint(functionName)

    const selfBoundHintForBinding = (selfBindingText: string) =>
      selfBoundHint(functionName, selfBindingText, thisType)

    const hint = pipe(
      selfBinding,
      Option.match({
        onNone: ordinaryHintForName,
        onSome: selfBoundHintForBinding
      })
    )

    return makeFindings(
      match.target,
      `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
      hint,
      match.fact
    )
  }

  const preferEffectFn = makeBuiltinPolicy(
    "prefer-effect-fn",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectFnMatcher,
    Function.constant(makePreferEffectFnFindings)
  )

  return preferEffectFn
}

export const preferEffectFn = makePreferEffectFn()

const makeNoTrivialEffectFn = () => {
  const noTrivialEffectFn = makeBuiltinPolicy(
    "no-trivial-effect-fn",
    effectFunctionsAndSchemasMatcherCatalog.noTrivialEffectFnMatcher,
    factGuidance(
      "Avoid named Effect.fn wrappers that only forward their parameters.",
      "Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior."
    )
  )

  return noTrivialEffectFn
}

export const noTrivialEffectFn = makeNoTrivialEffectFn()

const makeNoImmediateEffectSync = () => {
  const noImmediateEffectSync = makeBuiltinPolicy(
    "no-immediate-effect-sync",
    effectFunctionsAndSchemasMatcherCatalog.noImmediateEffectSyncMatcher,
    factGuidance(
      "Avoid immediately running a locally bound Effect.sync.",
      "Run the synchronous action directly at this startup boundary, or retain the Effect only when it is deferred or composed into a larger workflow."
    )
  )

  return noImmediateEffectSync
}

export const noImmediateEffectSync = makeNoImmediateEffectSync()

const makePreferEffectFunctionConstant = () => {
  const message = "Avoid a handwritten constant thunk."

  const preferEffectFunctionConstantGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { expressionText } = match.fact

      return makeFindings(
        match.target,
        message,
        `Use Function.constant(${expressionText}) from Effect when a zero-argument function only returns a stable value. ` +
          "Function.constant captures that value once and returns a zero-argument function.",
        match.fact
      )
    }

  const preferEffectFunctionConstant = makeBuiltinPolicy(
    "prefer-effect-function-constant",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectFunctionConstantMatcher,
    preferEffectFunctionConstantGuidance
  )

  return preferEffectFunctionConstant
}

export const preferEffectFunctionConstant = makePreferEffectFunctionConstant()

const makePreferEffectPropertyAccessors = () => {
  const preferEffectPropertyAccessorsGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { name, accessedText, moduleName, propertyKey } = match.fact
      const suggestion = `${moduleName}.get(${propertyKey})`

      return makeFindings(
        match.target,
        `Avoid defining ${name} only to read ${accessedText}.`,
        `Replace this property-access-only function with ${suggestion} from Effect. ` +
          "Use Struct.get for non-record data types, and Record.get or Record.has for records.",
        match.fact
      )
    }

  const preferEffectPropertyAccessors = makeBuiltinPolicy(
    "prefer-effect-property-accessors",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectPropertyAccessorsMatcher,
    preferEffectPropertyAccessorsGuidance
  )

  return preferEffectPropertyAccessors
}

export const preferEffectPropertyAccessors = makePreferEffectPropertyAccessors()

const makePreferEffectfulPolicy = () => {
  const preferEffectfulFunctionGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { functionName } = match.fact

      return makeFindings(
        match.target,
        `Avoid synchronously unwrapping an Effect in ${functionName}.`,
        `Return the Effect from ${functionName} and compose callers with yield* or ` +
          "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.",
        match.fact
      )
    }

  const preferEffectfulFunction = makeBuiltinPolicy(
    "prefer-effectful-function",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectfulFunctionMatcher,
    preferEffectfulFunctionGuidance
  )

  return preferEffectfulFunction
}

export const preferEffectfulFunction = makePreferEffectfulPolicy()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectFunctionPolicies: ReadonlyArray<Policy> = Array.make(
  noTrivialEffectFn,
  noImmediateEffectSync,
  preferEffectFn,
  preferEffectfulFunction,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors
)

const makePreferSchemaTaggedStruct = () => {
  const message = "Prefer Schema.TaggedStruct when every field has a portable wire representation."

  const hint =
    "This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable " +
    "boundary, define it with Schema.TaggedStruct and a same-named decoded interface. Compose " +
    "multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound " +
    "values such as streams, effects, functions, compiler objects, and live handles, and use " +
    "Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only " +
    "for typed errors."

  const preferSchemaTaggedStruct = makeBuiltinPolicy(
    "prefer-schema-tagged-struct",
    effectFunctionsAndSchemasMatcherCatalog.preferSchemaTaggedStructMatcher,
    factGuidance(message, hint)
  )

  return preferSchemaTaggedStruct
}

export const preferSchemaTaggedStruct = makePreferSchemaTaggedStruct()

export const schemaModelingPolicies: ReadonlyArray<Policy> = Array.make(preferSchemaTaggedStruct)

const makePreferEffectSchemaConstructor = () => {
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
    match: Match<
      typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaConstructorMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
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

  const preferEffectSchemaConstructor = makeBuiltinPolicy(
    "prefer-effect-schema-constructor",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaConstructorMatcher,
    Function.constant(makePreferEffectSchemaConstructorFindings)
  )

  return preferEffectSchemaConstructor
}

export const preferEffectSchemaConstructor = makePreferEffectSchemaConstructor()

const makePreferEffectSchemaGuard = () => {
  const preferEffectSchemaGuardGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { propertyName, objectText } = match.fact

      return makeFindings(
        match.target,
        `Avoid using ${propertyName} in ${objectText} as a type guard.`,
        `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${objectText}).`,
        match.fact
      )
    }

  const preferEffectSchemaGuard = makeBuiltinPolicy(
    "prefer-effect-schema-guard",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaGuardMatcher,
    preferEffectSchemaGuardGuidance
  )

  return preferEffectSchemaGuard
}

export const preferEffectSchemaGuard = makePreferEffectSchemaGuard()

const makePreferEffectSchemaIs = () => {
  const preferEffectSchemaIsGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { valueText, operatorText, tagText, isNegated } = match.fact
      const schemaIsCheck = `Schema.is($schema)(${valueText})`
      const suggestion = isNegated ? `!${schemaIsCheck}` : schemaIsCheck

      return makeFindings(
        match.target,
        `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`,
        `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`,
        match.fact
      )
    }

  const preferEffectSchemaIs = makeBuiltinPolicy(
    "prefer-effect-schema-is",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaIsMatcher,
    preferEffectSchemaIsGuidance
  )

  return preferEffectSchemaIs
}

export const preferEffectSchemaIs = makePreferEffectSchemaIs()

const makePreferEffectSchemaRecord = () => {
  const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }

  const tupleTypeHint =
    "Replace a constructed tuple alias with a named Effect schema record, for example " +
    "export const Example = Schema.Struct({ myString: Schema.String, myNumber: " +
    "Schema.Number }); export interface Example extends Schema.Schema.Type<typeof Example> {}. " +
    "Keep a tuple only when its positions are inherently meaningful; process-bound runtime values " +
    "remain boundary types or explicit runtime data."

  const preferEffectSchemaRecordGuidance: Guidance<
    typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    (context: ProgramContext) =>
    (
      match: Match<
        typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const makeTupleFindings = (
        fact: Extract<
          typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
            infer Fact
          >
            ? Fact
            : never,
          { readonly kind: "tuple" }
        >
      ) =>
        makeFindings(
          match.target,
          `Avoid declaring ${fact.typeName} as a tuple type alias.`,
          tupleTypeHint,
          match.fact
        )

      const makeObjectFindings = (
        fact: Extract<
          typeof effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher extends Matcher<
            infer Fact
          >
            ? Fact
            : never,
          { readonly kind: "object" }
        >
      ) => {
        const toExampleFile = toRelativeFileName(context.projectRoot)
        const exampleFile = toExampleFile(fact.constructionFileName)

        return makeFindings(
          match.target,
          `Avoid declaring ${fact.typeName} as ${fact.kindLabel} when this project constructs ` +
            "its values.",
          `Object literals of this shape are built in ${exampleFile}, so ${fact.typeName} is a ` +
            "data definition rather than a boundary type. Define it as an Effect schema " +
            "record — export const " +
            `${fact.typeName} = Schema.Struct({ ... }); export interface ${fact.typeName} extends ` +
            `Schema.Schema.Type<typeof ${fact.typeName}> {}. Construct trusted values with ` +
            `${fact.typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
            "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
            "as boundary types or explicit runtime data.",
          match.fact
        )
      }

      return pipe(
        EffectMatch.value(match.fact),
        EffectMatch.when({ kind: "tuple" }, makeTupleFindings),
        EffectMatch.when({ kind: "object" }, makeObjectFindings),
        EffectMatch.exhaustive
      )
    }

  const preferEffectSchemaRecord = makeBuiltinPolicy(
    "prefer-effect-schema-record",
    effectFunctionsAndSchemasMatcherCatalog.preferEffectSchemaRecordMatcher,
    preferEffectSchemaRecordGuidance
  )

  return preferEffectSchemaRecord
}

export const preferEffectSchemaRecord = makePreferEffectSchemaRecord()

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectSchemaPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaRecord
)

const makeNoUnsafeEffectApis = () => {
  const message = "Avoid unsafe Effect APIs."

  const hint =
    "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
    "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
    "instead of using an API whose name contains unsafe."

  const noUnsafeEffectApis = makeBuiltinPolicy(
    "no-unsafe-effect-apis",
    safetyMatcherCatalog.noUnsafeEffectApisMatcher,
    factGuidance(message, hint)
  )

  return noUnsafeEffectApis
}

export const noUnsafeEffectApis = makeNoUnsafeEffectApis()

export const unsafeEffectPolicies: ReadonlyArray<Policy> = Array.make(noUnsafeEffectApis)

// Member order is pinned because concatenated categories define the public report block order.
export const effectIdiomPolicies: ReadonlyArray<Policy> = pipe(
  effectSchemaPolicies,
  Array.appendAll(effectFunctionPolicies),
  Array.appendAll(effectCollectionPolicies),
  Array.appendAll(schemaModelingPolicies),
  Array.appendAll(unsafeEffectPolicies),
  Array.appendAll(equivalencePolicies)
)

const makeProcessEnvironment = () => {
  const message = "Avoid reading process.env directly in production code."

  const hint =
    "Declare runtime configuration with Effect Config and inject a ConfigProvider at the " +
    "application boundary. Keep direct environment access only in composition roots and tests."

  const processEnvironment = makeBuiltinPolicy(
    "process-environment",
    safetyMatcherCatalog.processEnvironmentMatcher,
    factGuidance(message, hint)
  )

  return processEnvironment
}

export const processEnvironment = makeProcessEnvironment()

export const environmentPolicies: ReadonlyArray<Policy> = Array.make(processEnvironment)

const makeNoUndefined = () => {
  const optionHint =
    "Use Effect's Option module to model optional values, and convert nullable boundaries " +
    "with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a " +
    "third-party signature forces undefined on a callback, keep the callback inline or " +
    "annotate it with the library's own callback type so the undefined stays in the " +
    "library's declaration, not yours."

  const undefinedMessages: Record<
    (typeof safetyMatcherCatalog.noUndefinedMatcher extends Matcher<infer Fact>
      ? Fact
      : never)["kind"],
    string
  > = {
    parameter: "Avoid function parameters that accept undefined.",
    "return-type": "Avoid function return types that include undefined.",
    "return-expression": "Avoid returning undefined from functions.",
    "type-declaration": "Avoid optional or undefined properties in type declarations.",
    comparison: "Avoid comparing values against undefined."
  }

  const noUndefinedGuidance: Guidance<
    typeof safetyMatcherCatalog.noUndefinedMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof safetyMatcherCatalog.noUndefinedMatcher extends Matcher<infer Fact> ? Fact : never
      >
    ) =>
      makeFindings(match.target, undefinedMessages[match.fact.kind], optionHint, match.fact)

  const noUndefined = makeBuiltinPolicy(
    "no-undefined",
    safetyMatcherCatalog.noUndefinedMatcher,
    noUndefinedGuidance
  )

  return noUndefined
}

export const noUndefined = makeNoUndefined()

const makeNoUnused = () => {
  const message = "Avoid unused imports, declarations, and parameters."

  const hint =
    "Delete the unused import, variable, function, type, or parameter. " +
    "If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."

  const noUnused = makeBuiltinPolicy(
    "no-unused",
    safetyMatcherCatalog.noUnusedMatcher,
    factGuidance(message, hint)
  )

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

  const noVoidFunctions = makeBuiltinPolicy(
    "no-void-functions",
    safetyMatcherCatalog.noVoidFunctionsMatcher,
    factGuidance(message, hint)
  )

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

  const noThrow = makeBuiltinPolicy(
    "no-throw",
    safetyMatcherCatalog.noThrowMatcher,
    factGuidance(message, hint)
  )

  return noThrow
}

export const noThrow = makeNoThrow()

const makeNoNewError = () => {
  const message = "Avoid using new Error() directly."

  const hint =
    "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() " +
    "instead of bare new Error()."

  const noNewError = makeBuiltinPolicy(
    "no-new-error",
    safetyMatcherCatalog.noNewErrorMatcher,
    factGuidance(message, hint)
  )

  return noNewError
}

export const noNewError = makeNoNewError()

const makeNoErrorType = () => {
  const message = "Avoid the built-in Error type."

  const hint =
    "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
    "type parameter, or use unknown at an untyped boundary."

  const noErrorType = makeBuiltinPolicy(
    "no-error-type",
    safetyMatcherCatalog.noErrorTypeMatcher,
    factGuidance(message, hint)
  )

  return noErrorType
}

export const noErrorType = makeNoErrorType()

const makeNoTryCatch = () => {
  const message = "Avoid try/catch for error handling."

  const hint =
    "Model effectful code that can fail as an Effect and declare its failures as explicit " +
    'Schema.TaggedErrorClass classes, for example: class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {}) {}. ' +
    "Recover with Effect.catchTag (or a variant such as Effect.catchTags / Effect.catch) instead of catching inside a try block."

  const noTryCatch = makeBuiltinPolicy(
    "no-try-catch",
    safetyMatcherCatalog.noTryCatchMatcher,
    factGuidance(message, hint)
  )

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

const makeNoNestedIfStatements = () => {
  const message = "Avoid nesting if statements."

  const hint =
    "Combine related conditions with boolean operators, or use an early return so this " +
    "condition can remain a single-level if statement."

  const noNestedIfStatements = makeBuiltinPolicy(
    "no-nested-if-statements",
    safetyMatcherCatalog.noNestedIfStatementsMatcher,
    factGuidance(message, hint)
  )

  return noNestedIfStatements
}

export const noNestedIfStatements = makeNoNestedIfStatements()

const makeNoNonNullAssertion = () => {
  const message = "Avoid non-null assertions."

  const hint =
    "The ! operator silences the type checker instead of handling the absent case, " +
    "trading a compile-time proof for a runtime crash. Convert the nullable value " +
    "with Option.fromNullishOr and handle both branches (Option.match, " +
    "Option.getOrElse), or narrow it with a type guard the checker verifies."

  const noNonNullAssertion = makeBuiltinPolicy(
    "no-non-null-assertion",
    safetyMatcherCatalog.noNonNullAssertionMatcher,
    factGuidance(message, hint)
  )

  return noNonNullAssertion
}

export const noNonNullAssertion = makeNoNonNullAssertion()

const makeNoDuplicateIfBodies = () => {
  const message = "Avoid if branches that repeat the body of the branch before them."

  const makeNoDuplicateIfBodiesFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noDuplicateIfBodiesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      message,
      "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${match.fact.combinedCondition}) { ... }.`,
      undefined
    )

  const noDuplicateIfBodies = makeBuiltinPolicy(
    "no-duplicate-if-bodies",
    mutationQualityMatcherCatalog.noDuplicateIfBodiesMatcher,
    Function.constant(makeNoDuplicateIfBodiesFindings)
  )

  return noDuplicateIfBodies
}

export const noDuplicateIfBodies = makeNoDuplicateIfBodies()

export const branchStructurePolicies: ReadonlyArray<Policy> = Array.make(
  noNestedIfStatements,
  noNonNullAssertion,
  noDuplicateIfBodies
)

const makeNoDuplicateFunctionNames = () => {
  const makeNoDuplicateFunctionNamesFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noDuplicateFunctionNamesMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid declaring the top-level function ${match.fact.functionName} with an identical signature in multiple files.`,
      `${match.fact.functionName} is declared with the same signature in ${match.fact.otherFiles}, which makes ` +
        "the copies semantic duplicates. Extract one shared implementation into a module " +
        "scoped to its domain and import it from every file that uses it. Name the module " +
        "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
        "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
        "account.ts#make) are module vocabulary, not duplicates.",
      undefined
    )

  const noDuplicateFunctionNames = makeBuiltinPolicy(
    "no-duplicate-function-names",
    mutationQualityMatcherCatalog.noDuplicateFunctionNamesMatcher,
    Function.constant(makeNoDuplicateFunctionNamesFindings)
  )

  return noDuplicateFunctionNames
}

export const noDuplicateFunctionNames = makeNoDuplicateFunctionNames()

export const duplicateDeclarationPolicies: ReadonlyArray<Policy> =
  Array.make(noDuplicateFunctionNames)

const makeNoExplicitAnyReturn = () => {
  const message = "Avoid function return types that include any."

  const hint =
    "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
    "use unknown and narrow before use."

  const noExplicitAnyReturn = makeBuiltinPolicy(
    "no-explicit-any-return",
    mutationQualityMatcherCatalog.noExplicitAnyReturnMatcher,
    factGuidance(message, hint)
  )

  return noExplicitAnyReturn
}

export const noExplicitAnyReturn = makeNoExplicitAnyReturn()

const makeNoMultipleBooleanOperators = () => {
  const message = "Avoid combining more than one boolean operator in a single expression."

  const hint =
    "Declare multiple constant variables instead of combining operators into a " +
    "single expression."

  const noMultipleBooleanOperators = makeBuiltinPolicy(
    "no-multiple-boolean-operators",
    mutationQualityMatcherCatalog.noMultipleBooleanOperatorsMatcher,
    factGuidance(message, hint)
  )

  return noMultipleBooleanOperators
}

export const noMultipleBooleanOperators = makeNoMultipleBooleanOperators()

const makeNoInlineBooleanExpressions = () => {
  const message = "Avoid boolean operators inline in an if statement condition."

  const hint =
    "Extract the expression into a well-named const variable declaration above the if " +
    "statement and use that variable in the if condition."

  const noInlineBooleanExpressions = makeBuiltinPolicy(
    "no-inline-boolean-expressions",
    mutationQualityMatcherCatalog.noInlineBooleanExpressionsMatcher,
    factGuidance(message, hint)
  )

  return noInlineBooleanExpressions
}

export const noInlineBooleanExpressions = makeNoInlineBooleanExpressions()

export const expressionPolicies: ReadonlyArray<Policy> = Array.make(
  noExplicitAnyReturn,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions
)

const makeNoMutableArrayMethods = () => {
  const hint =
    "This is a sign that you're doing something fundamentally procedural when you should " +
    "be taking a more functional approach. Use Effect's Array module, such as " +
    "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
    "instead of manipulating an array in place."

  const makeNoMutableArrayMethodsFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noMutableArrayMethodsMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid mutating arrays with Array.prototype.${match.fact.methodName}().`,
      hint,
      undefined
    )

  const noMutableArrayMethods = makeBuiltinPolicy(
    "no-mutable-array-methods",
    mutationQualityMatcherCatalog.noMutableArrayMethodsMatcher,
    Function.constant(makeNoMutableArrayMethodsFindings)
  )

  return noMutableArrayMethods
}

export const noMutableArrayMethods = makeNoMutableArrayMethods()

const makeNoMutableVariableDeclarations = () => {
  const hint =
    "Declare multiple const values to represent each state instead of mutating a single " +
    "variable, and use immutable values that are not reassigned. When the value must " +
    "genuinely evolve over time (a module-level counter, a cell shared across " +
    "closures), hold it in a Ref inside the Effect runtime instead of a let binding."

  const makeNoMutableVariableDeclarationsFindings = (
    match: Match<
      typeof mutationQualityMatcherCatalog.noMutableVariableDeclarationsMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid declaring mutable variables with ${match.fact.kind}.`,
      hint,
      undefined
    )

  const noMutableVariableDeclarations = makeBuiltinPolicy(
    "no-mutable-variable-declarations",
    mutationQualityMatcherCatalog.noMutableVariableDeclarationsMatcher,
    Function.constant(makeNoMutableVariableDeclarationsFindings)
  )

  return noMutableVariableDeclarations
}

export const noMutableVariableDeclarations = makeNoMutableVariableDeclarations()

const makeNoMutation = () => {
  const message = "Avoid mutating first-party data."

  const hint =
    "Match the fix to the scale of the state. Local data: derive a new value — " +
    "Array.replace or Array.modify for elements (both return Option — handle absence " +
    "with Option.getOrElse or Option.match; for a nonempty array's head or last element, " +
    "use Array.setHeadNonEmpty, Array.modifyHeadNonEmpty, Array.setLastNonEmpty, or " +
    "Array.modifyLastNonEmpty), " +
    "Struct.evolve for record fields, a fresh const for rebindings. Shared, long-lived " +
    "state (module-scope bindings, closure-captured cells, subscriber registries): do " +
    "not patch the assignment — move the state into the Effect runtime, holding it in " +
    "a Ref (SynchronizedRef under contention, PubSub for subscriber sets); when a " +
    "whole file manages state this way, invert the module into Effect behind a Layer " +
    "with one runtime entry at the boundary. Never mutate built-ins (prototypes, " +
    "globals). Mutating a third-party structure whose API contract requires assignment " +
    "(process.exitCode, a WebSocket handler slot, a React ref cell) is permitted."

  const noMutation = makeBuiltinPolicy(
    "no-mutation",
    mutationQualityMatcherCatalog.noMutationMatcher,
    factGuidance(message, hint)
  )

  return noMutation
}

export const noMutation = makeNoMutation()

const makeNoWeakMap = () => {
  const message = "Avoid WeakMap because it keeps mutable state outside Effect."

  const hint =
    "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
    "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
    "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

  const noWeakMap = makeBuiltinPolicy(
    "no-weak-map",
    mutationQualityMatcherCatalog.noWeakMapMatcher,
    factGuidance(message, hint)
  )

  return noWeakMap
}

export const noWeakMap = makeNoWeakMap()

export const mutationPolicies: ReadonlyArray<Policy> = Array.make(
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noWeakMap
)

// Member order is pinned because concatenated categories define the public report block order.
export const expressionAndMutationPolicies: ReadonlyArray<Policy> = pipe(
  expressionPolicies,
  Array.appendAll(mutationPolicies),
  Array.appendAll(branchStructurePolicies),
  Array.appendAll(duplicateDeclarationPolicies)
)

const makePreferSpecificOperationNames = () => {
  const preferSpecificOperationNamesGuidance: Guidance<
    typeof namingMatcherCatalog.preferSpecificOperationNamesMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.preferSpecificOperationNamesMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) => {
      const { nameText, vague, role, renamed } = match.fact

      return makeFindings(
        match.target,
        `${nameText} uses the vague operation ${vague}, but its body has a unique ${role} role.`,
        `Rename to ${renamed}, preserving the known object or result noun.`,
        match.fact
      )
    }

  const preferSpecificOperationNames = makeBuiltinPolicy(
    "prefer-specific-operation-names",
    namingMatcherCatalog.preferSpecificOperationNamesMatcher,
    preferSpecificOperationNamesGuidance
  )

  return preferSpecificOperationNames
}

export const preferSpecificOperationNames = makePreferSpecificOperationNames()

const makeRequireCallableRoleNameConsistency = () => {
  const requireCallableRoleNameConsistencyGuidance: Guidance<
    typeof namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { nameText, role, expected } = match.fact

      return makeFindings(
        match.target,
        `${nameText} claims the ${role} role, but does not provide ${expected}.`,
        `Rename away from the ${role} role noun, or change the signature and body so the ` +
          `${role} contract holds.`,
        match.fact
      )
    }

  const requireCallableRoleNameConsistency = makeBuiltinPolicy(
    "require-callable-role-name-consistency",
    namingMatcherCatalog.requireCallableRoleNameConsistencyMatcher,
    requireCallableRoleNameConsistencyGuidance
  )

  return requireCallableRoleNameConsistency
}

export const requireCallableRoleNameConsistency = makeRequireCallableRoleNameConsistency()

const makeRequirePredicateNameConsistency = () => {
  const makeRequirePredicateNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeNonBooleanPredicateFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "non-boolean-predicate" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims a predicate, but its result shape is ${fact.shape}.`,
        "Rename the function so its operation matches the non-boolean result, or return a " +
          "boolean or type-predicate result.",
        match.fact
      )

    const makeBooleanIncompatibleFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requirePredicateNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "boolean-incompatible" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} returns boolean, but claims the ${fact.operation} operation.`,
        "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
          "contain, include, match, exist, every, some, startsWith, or endsWith.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "non-boolean-predicate" }, makeNonBooleanPredicateFindings),
      EffectMatch.when({ kind: "boolean-incompatible" }, makeBooleanIncompatibleFindings),
      EffectMatch.exhaustive
    )
  }

  const requirePredicateNameConsistency = makeBuiltinPolicy(
    "require-predicate-name-consistency",
    namingMatcherCatalog.requirePredicateNameConsistencyMatcher,
    Function.constant(makeRequirePredicateNameConsistencyFindings)
  )

  return requirePredicateNameConsistency
}

export const requirePredicateNameConsistency = makeRequirePredicateNameConsistency()

export const predicateNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requirePredicateNameConsistency
)

export const callableRoleNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireCallableRoleNameConsistency,
  preferSpecificOperationNames
)

const makeRequireCommandNameConsistency = () => {
  const makeRequireCommandNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeFalseCommandFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "false-command" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
        "Rename away from the command verb, or implement a true command with a void or Effect.void result.",
        match.fact
      )

    const makeHiddenCommandFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireCommandNameConsistencyMatcher extends Matcher<infer Fact>
          ? Fact
          : never,
        { readonly kind: "hidden-command" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
        "Rename with command language such as save, write, send, publish, set, update, remove, or delete.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "false-command" }, makeFalseCommandFindings),
      EffectMatch.when({ kind: "hidden-command" }, makeHiddenCommandFindings),
      EffectMatch.exhaustive
    )
  }

  const requireCommandNameConsistency = makeBuiltinPolicy(
    "require-command-name-consistency",
    namingMatcherCatalog.requireCommandNameConsistencyMatcher,
    Function.constant(makeRequireCommandNameConsistencyFindings)
  )

  return requireCommandNameConsistency
}

export const requireCommandNameConsistency = makeRequireCommandNameConsistency()

const makeRequireLookupTotalityNameConsistency = () => {
  const makeRequireLookupTotalityNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makeAbsenceClaimFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "optional-claim" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims optional lookup via ${fact.claimLabel}, but returns total data.`,
        "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name.",
        match.fact
      )

    const makePresenceClaimFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "total-claim" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims required access via ${fact.claimLabel}, but returns optional data.`,
        "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "optional-claim" }, makeAbsenceClaimFindings),
      EffectMatch.when({ kind: "total-claim" }, makePresenceClaimFindings),
      EffectMatch.exhaustive
    )
  }

  const requireLookupTotalityNameConsistency = makeBuiltinPolicy(
    "require-lookup-totality-name-consistency",
    namingMatcherCatalog.requireLookupTotalityNameConsistencyMatcher,
    Function.constant(makeRequireLookupTotalityNameConsistencyFindings)
  )

  return requireLookupTotalityNameConsistency
}

export const requireLookupTotalityNameConsistency = makeRequireLookupTotalityNameConsistency()

export const lookupNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireLookupTotalityNameConsistency
)

export const commandNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireCommandNameConsistency
)

const makeRequireConstructionNameConsistency = () => {
  const makeRequireConstructionNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makeFactoryMasqueradeFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "factory-masquerade" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} claims factory construction via ${fact.operation}, but looks up or projects existing data.`,
        "Rename with lookup or projection vocabulary, or return a freshly constructed value.",
        match.fact
      )

    const makeUnnamedConstructionFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireConstructionNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "unnamed-construction" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} constructs a value, but does not use construction vocabulary.`,
        "Rename with make/create/build/construct (for example makeUser), or use a recognized " +
          "variant constructor such as some/none/left/right/succeed/fail/of.",
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "factory-masquerade" }, makeFactoryMasqueradeFindings),
      EffectMatch.when({ kind: "unnamed-construction" }, makeUnnamedConstructionFindings),
      EffectMatch.exhaustive
    )
  }

  const requireConstructionNameConsistency = makeBuiltinPolicy(
    "require-construction-name-consistency",
    namingMatcherCatalog.requireConstructionNameConsistencyMatcher,
    Function.constant(makeRequireConstructionNameConsistencyFindings)
  )

  return requireConstructionNameConsistency
}

export const requireConstructionNameConsistency = makeRequireConstructionNameConsistency()

const makeRequireConversionDirectionConsistency = () => {
  const makeRequireConversionDirectionConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireConversionDirectionConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const { axis, nameText, claimed, expected } = match.fact

    const resultMessage = () =>
      `${nameText} names its conversion result as ${claimed}, but it returns ${expected}.`

    const sourceMessage = () =>
      `${nameText} names its conversion source as ${claimed}, but its source is ${expected}.`

    const resultHint = () =>
      `Rename the result phrase to ${expected}, or return a value whose concept is ${claimed}.`

    const sourceHint = () =>
      `Rename the source phrase to ${expected}, or accept a parameter whose concept is ${claimed}.`

    const message = pipe(
      EffectMatch.value(axis),
      EffectMatch.when("result", resultMessage),
      EffectMatch.when("source", sourceMessage),
      EffectMatch.exhaustive
    )

    const hint = pipe(
      EffectMatch.value(axis),
      EffectMatch.when("result", resultHint),
      EffectMatch.when("source", sourceHint),
      EffectMatch.exhaustive
    )

    return makeFindings(match.target, message, hint, match.fact)
  }

  const requireConversionDirectionConsistency = makeBuiltinPolicy(
    "require-conversion-direction-consistency",
    namingMatcherCatalog.requireConversionDirectionConsistencyMatcher,
    Function.constant(makeRequireConversionDirectionConsistencyFindings)
  )

  return requireConversionDirectionConsistency
}

export const requireConversionDirectionConsistency = makeRequireConversionDirectionConsistency()

export const constructionNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireConstructionNameConsistency
)

export const conversionNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireConversionDirectionConsistency
)

const makePreferResultConceptNames = () => {
  const preferResultConceptNamesGuidance: Guidance<
    typeof namingMatcherCatalog.preferResultConceptNamesMatcher extends Matcher<infer Fact>
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof namingMatcherCatalog.preferResultConceptNamesMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) => {
      const { nameText, claimed, expected } = match.fact

      return makeFindings(
        match.target,
        `${nameText} names its result as ${claimed}, but it returns ${expected}.`,
        `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
          `using ${expected}FromSource or sourceTo${expected} when direction matters.`,
        match.fact
      )
    }

  const preferResultConceptNames = makeBuiltinPolicy(
    "prefer-result-concept-names",
    namingMatcherCatalog.preferResultConceptNamesMatcher,
    preferResultConceptNamesGuidance
  )

  return preferResultConceptNames
}

export const preferResultConceptNames = makePreferResultConceptNames()

const makeRequireResultCardinalityNameConsistency = () => {
  const makeRequireResultCardinalityNameConsistencyFindings = (
    match: Match<
      typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
        infer Fact
      >
        ? Fact
        : never
    >
  ) => {
    const makePluralForOneFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "plural-for-one" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} names its result as plural ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to singular ${fact.singular} so the name matches a single returned value.`,
        match.fact
      )

    const makeSingularForManyFindings = (
      fact: Extract<
        typeof namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never,
        { readonly kind: "singular-for-many" }
      >
    ) =>
      makeFindings(
        match.target,
        `${fact.nameText} names its result as singular ${fact.claimed}, but returns ${fact.cardinality}.`,
        `Rename the result noun to plural ${fact.plural} so the name matches the collection result.`,
        match.fact
      )

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "plural-for-one" }, makePluralForOneFindings),
      EffectMatch.when({ kind: "singular-for-many" }, makeSingularForManyFindings),
      EffectMatch.exhaustive
    )
  }

  const requireResultCardinalityNameConsistency = makeBuiltinPolicy(
    "require-result-cardinality-name-consistency",
    namingMatcherCatalog.requireResultCardinalityNameConsistencyMatcher,
    Function.constant(makeRequireResultCardinalityNameConsistencyFindings)
  )

  return requireResultCardinalityNameConsistency
}

export const requireResultCardinalityNameConsistency = makeRequireResultCardinalityNameConsistency()

const makeRequireResultShapeNameConsistency = () => {
  const requireResultShapeNameConsistencyGuidance: Guidance<
    typeof dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher extends Matcher<
      infer Fact
    >
      ? Fact
      : never
  > =
    () =>
    (
      match: Match<
        typeof dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher extends Matcher<
          infer Fact
        >
          ? Fact
          : never
      >
    ) => {
      const { nameText, expected, observed, label } = match.fact

      return makeFindings(
        match.target,
        `${nameText} claims a ${expected} result via ${label}, but returns ${observed}.`,
        `Align the name with the actual result, or change the return type to ${expected}. ` +
          `Keep strong operation words only when the result shape matches.`,
        match.fact
      )
    }

  const requireResultShapeNameConsistency = makeBuiltinPolicy(
    "require-result-shape-name-consistency",
    dataModelMatcherCatalog.requireResultShapeNameConsistencyMatcher,
    requireResultShapeNameConsistencyGuidance
  )

  return requireResultShapeNameConsistency
}

export const requireResultShapeNameConsistency = makeRequireResultShapeNameConsistency()

export const resultConceptNamingPolicies: ReadonlyArray<Policy> =
  Array.make(preferResultConceptNames)

export const resultContractNamingPolicies: ReadonlyArray<Policy> = Array.make(
  requireResultCardinalityNameConsistency,
  requireResultShapeNameConsistency
)

// Member order is pinned because concatenated categories define the public report block order.
export const semanticNamingPolicies: ReadonlyArray<Policy> = pipe(
  resultConceptNamingPolicies,
  Array.appendAll(predicateNamingPolicies),
  Array.appendAll(constructionNamingPolicies),
  Array.appendAll(lookupNamingPolicies),
  Array.appendAll(resultContractNamingPolicies),
  Array.appendAll(conversionNamingPolicies),
  Array.appendAll(commandNamingPolicies),
  Array.appendAll(callableRoleNamingPolicies)
)

// Category order is fixed because it defines report order.
export const defaultPolicyCatalog = pipe(
  effectIdiomPolicies,
  Array.appendAll(commentAndDeclarationPolicies),
  Array.appendAll(conceptAndCompositionPolicies),
  Array.appendAll(controlFlowPolicies),
  Array.appendAll(semanticNamingPolicies),
  Array.appendAll(errorHygienePolicies),
  Array.appendAll(expressionAndMutationPolicies),
  Array.appendAll(dispatchAndCollectionPolicies)
)

const materializeSpecificAdvice = (
  imperativeInput: ImperativeStateSignals,
  pipelineInput: PipelineSignals,
  namedElements: ReadonlyArray<NamedDetection>,
  conceptSignals: ReadonlyArray<Signal["detections"][number]>
): ReadonlyArray<Advice> => {
  const imperativeAdvice = imperativeStateManager(imperativeInput)
  const sideEffectAdvice = sideEffectLaundering(namedElements)
  const pipelineAdvice = pipelineHostile(pipelineInput)
  const conceptAdvice = conceptProliferation(conceptSignals)
  const adviceGroups = Array.make(imperativeAdvice, sideEffectAdvice, pipelineAdvice, conceptAdvice)

  return Array.flatten(adviceGroups)
}

export const defaultSpecificAdvice = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> => {
  const elementsOf = signalOf(signals)
  const namedElements = defaultNamedElements(signals)
  const noMutation = elementsOf("no-mutation")
  const preferHashMap = elementsOf("prefer-hash-map")
  const preferHashSet = elementsOf("prefer-hash-set")
  const noMutableArrayMethods = elementsOf("no-mutable-array-methods")
  const noMutableVariableDeclarations = elementsOf("no-mutable-variable-declarations")
  const noNestedCalls = elementsOf("no-nested-calls")
  const preferCurried = elementsOf("prefer-curried-data-last-functions")
  const conceptSignals = elementsOf("concept-control")

  const imperativeInput = ImperativeStateSignals.make({
    noMutation,
    preferHashMap,
    preferHashSet,
    noMutableArrayMethods,
    noMutableVariableDeclarations
  })

  const pipelineInput = PipelineSignals.make({
    noNestedCalls,
    preferCurriedDataLastFunctions: preferCurried
  })

  return materializeSpecificAdvice(imperativeInput, pipelineInput, namedElements, conceptSignals)
}

const materializeDefaultAdvice = (
  signals: ReadonlyArray<Signal>,
  namedElements: ReadonlyArray<NamedDetection>
): ReadonlyArray<Advice> => {
  const specificItems = defaultSpecificAdvice(signals)
  const densityItems = highSignalDensity(namedElements)
  const subsystemItems = hotSubsystem(namedElements)
  const dominanceItems = ruleDominance(namedElements)

  const densityAfterFallbackSuppression =
    filterFallbackAdviceForUncoveredFiles(specificItems)(densityItems)

  const systemicSignals = SystemicSignals.make({
    hotSubsystem: subsystemItems,
    highSignalDensity: densityAfterFallbackSuppression
  })

  const systemicItems = systemicHotspots(systemicSignals)

  const adviceGroups = Array.make(
    specificItems,
    densityAfterFallbackSuppression,
    subsystemItems,
    dominanceItems,
    systemicItems
  )

  return Array.flatten(adviceGroups)
}

export const defaultDerive = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> => {
  const namedElements = defaultNamedElements(signals)

  return materializeDefaultAdvice(signals, namedElements)
}

export const defaultWiring = makeWiring({
  policies: defaultPolicyCatalog,
  derive: defaultDerive
})

const defaultFiles = Array.of("**/*")

const defaultConfigEntries = Array.of({
  files: defaultFiles,
  wiring: defaultWiring
})

export const defaultConfig = defineConfig(defaultConfigEntries)
