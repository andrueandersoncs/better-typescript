import { Array, Function, pipe } from "effect"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { commentLayoutMatcherCatalog } from "@better-typescript/matchers/builtins/commentLayoutMatcherCatalog"
import { functionalMatcherCatalog } from "@better-typescript/matchers/builtins/functionalMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makeNoMultiLineComments = () => {
  const message = "Avoid multi-line comments."

  const hint =
    "Code should be self-documenting. Use isolated single-line comments only to explain WHY " +
    "something is done, never HOW. Block comments and JSDoc (/* ... */ and /** ... */) are " +
    "disallowed entirely. Consecutive single-line comments form a multi-line comment even when " +
    "blank lines separate them, so keep one comment per explanation. For architectural decisions " +
    "that require longer explanation, create an Architectural Decision Record (ADR) as a " +
    "markdown file in the adrs/ directory instead."

  const noMultiLineComments = makeBuiltinPolicy({
    name: "no-multi-line-comments",
    matcher: commentLayoutMatcherCatalog.noMultiLineCommentsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noMultiLineComments
}

export const noMultiLineComments = makeNoMultiLineComments()

const makeRequireBecauseInComments = () => {
  const message = 'Comments must include the word "because".'

  const hint =
    "Delete comments that only restate what the code does. Otherwise, explain why the " +
    'code or approach is necessary using the word "because". Every comment carries this ' +
    "obligation; there are no exempt comment forms."

  const requireBecauseInComments = makeBuiltinPolicy({
    name: "require-because-in-comments",
    matcher: commentLayoutMatcherCatalog.requireBecauseInCommentsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return requireBecauseInComments
}

export const requireBecauseInComments = makeRequireBecauseInComments()

const makeNoLongComments = () => {
  const message = "Comments must be at most 100 characters."

  const hint =
    "Keep each comment within 100 characters because longer comments stop reading as code " +
    "annotations. State the single load-bearing reason; move longer explanations into an " +
    "Architectural Decision Record (ADR) in the adrs/ directory instead."

  const noLongComments = makeBuiltinPolicy({
    name: "no-long-comments",
    matcher: commentLayoutMatcherCatalog.noLongCommentsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

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

  const requireBlankLinesAroundMultilineDeclarations = makeBuiltinPolicy({
    name: "require-blank-lines-around-multiline-declarations",
    matcher: commentLayoutMatcherCatalog.requireBlankLinesAroundMultilineDeclarationsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

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

  const noBlankLinesBetweenSingleLineDeclarations = makeBuiltinPolicy({
    name: "no-blank-lines-between-single-line-declarations",
    matcher: commentLayoutMatcherCatalog.noBlankLinesBetweenSingleLineDeclarationsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noBlankLinesBetweenSingleLineDeclarations
}

export const noBlankLinesBetweenSingleLineDeclarations =
  makeNoBlankLinesBetweenSingleLineDeclarations()

export const declarationSpacingPolicies: ReadonlyArray<Policy> = Array.make(
  requireBlankLinesAroundMultilineDeclarations,
  noBlankLinesBetweenSingleLineDeclarations
)

const preferInferredTypeMessages = {
  const: "Avoid a const annotation when its initializer infers the same type.",
  return: "Avoid a return annotation when the function body infers the same type.",
  contextual: "Avoid annotations on a contextually typed function."
} as const

const preferInferredTypeHints = {
  const:
    "Delete the type annotation. Keep annotations that widen a value or guide generic inference.",
  return:
    "Delete the return type annotation. Keep explicit contracts when inference changes the signature.",
  contextual:
    "Delete the parameter and return annotations together; the surrounding expression supplies them."
} as const

const makePreferInferredTypes = () => {
  const makePreferInferredTypesFindings = (
    match: Match<
      typeof functionalMatcherCatalog.preferInferredTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const message = preferInferredTypeMessages[match.fact.kind]
    const hint = preferInferredTypeHints[match.fact.kind]

    return makeFindings(match.target, message, hint, match.fact)
  }

  const preferInferredTypes = makeBuiltinPolicy({
    name: "prefer-inferred-types",
    matcher: functionalMatcherCatalog.preferInferredTypesMatcher,
    guidance: Function.constant(makePreferInferredTypesFindings),
    reported: true,
    stage: "program"
  })

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
