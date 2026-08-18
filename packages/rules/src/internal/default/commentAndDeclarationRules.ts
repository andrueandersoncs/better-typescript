import { noBlankLinesBetweenSingleLineDeclarationsScanner } from "../builtins/noBlankLinesBetweenSingleLineDeclarations.js"
import { requireBecauseInCommentsScanner } from "../builtins/requireBecauseInComments.js"
import { requireBlankLinesAroundMultilineDeclarationsScanner } from "../builtins/requireBlankLinesAroundMultilineDeclarations.js"
import { preferInferredTypesScanner } from "../builtins/preferInferredTypes.js"
import { Array, Function, pipe } from "effect"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"
import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"

const makeRequireBecauseInComments = () => {
  const message = 'Comments must explain why using the word "because".'
  const hint = "Delete the comment if it does not explain a reason."

  const requireBecauseInComments = makeRule("require-because-in-comments")(
    requireBecauseInCommentsScanner
  )(fixedRuleMessage(message, hint))

  return requireBecauseInComments
}

export const requireBecauseInComments = makeRequireBecauseInComments()

export const commentRules: ReadonlyArray<Rule> = Array.of(requireBecauseInComments)

const makeRequireBlankLinesAroundMultilineDeclarations = () => {
  const message = "Multi-line declarations must have a blank line above and below."

  const hint =
    "Insert an empty line before and after this declaration so its multi-line shape " +
    "is visually separated from neighboring statements. Single-line declarations do " +
    "not need surrounding blank lines; the first and last statements in a block are " +
    "exempt on the outer sides."

  const requireBlankLinesAroundMultilineDeclarations = makeRule(
    "require-blank-lines-around-multiline-declarations"
  )(requireBlankLinesAroundMultilineDeclarationsScanner)(fixedRuleMessage(message, hint))

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

  const noBlankLinesBetweenSingleLineDeclarations = makeRule(
    "no-blank-lines-between-single-line-declarations"
  )(noBlankLinesBetweenSingleLineDeclarationsScanner)(fixedRuleMessage(message, hint))

  return noBlankLinesBetweenSingleLineDeclarations
}

export const noBlankLinesBetweenSingleLineDeclarations =
  makeNoBlankLinesBetweenSingleLineDeclarations()

export const declarationSpacingRules: ReadonlyArray<Rule> = Array.make(
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
    match: Match<typeof preferInferredTypesScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const message = preferInferredTypeMessages[match.fact.kind]
    const hint = preferInferredTypeHints[match.fact.kind]

    return makeRuleMessage(message, hint)
  }

  const preferInferredTypes = makeRule("prefer-inferred-types")(preferInferredTypesScanner)(
    Function.constant(makePreferInferredTypesFindings)
  )

  return preferInferredTypes
}

export const preferInferredTypes = makePreferInferredTypes()

export const inferredTypeRules: ReadonlyArray<Rule> = Array.of(preferInferredTypes)

export const commentAndDeclarationRules: ReadonlyArray<Rule> = pipe(
  commentRules,
  Array.appendAll(inferredTypeRules),
  Array.appendAll(declarationSpacingRules)
)
