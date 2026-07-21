import { Array, HashSet, Schema } from "effect"
import * as ts from "typescript"
import { transparentWrapperKinds } from "../support/tsNode.js"
import { isExternalPackageArgument } from "../support/tsSignature.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"

// NoInlineClosuresFact is empty payload because guidance and matchers share identity.
export const NoInlineClosuresFact = Schema.Struct({})

export interface NoInlineClosuresFact extends Schema.Schema.Type<typeof NoInlineClosuresFact> {}

// emptyNoInlineClosuresFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoInlineClosuresFact = NoInlineClosuresFact.make({})

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node =>
  HashSet.has(transparentWrapperKinds, node.parent.kind)
    ? effectiveParent(node.parent)
    : node.parent

const inlineClosuresMatches = (context: MatchContext) => {
  const isExternalArgument = isExternalPackageArgument(context.checker)(context.program)

  const matchInlineClosure = (arrowFunction: ts.ArrowFunction) => {
    const parent = effectiveParent(arrowFunction)
    const hasSanctionedParent = HashSet.has(sanctionedParentKinds, parent.kind)
    const isExternalCallback = isExternalArgument(arrowFunction)
    const isSanctioned = hasSanctionedParent || isExternalCallback

    if (isSanctioned) {
      return Array.empty()
    }

    const match = makeNodeMatch(arrowFunction.equalsGreaterThanToken, emptyNoInlineClosuresFact)

    return Array.of(match)
  }

  return matchInlineClosure
}

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

export const noInlineClosuresMatcher = nodeMatcher(arrowFunctionKinds)(ts.isArrowFunction)(
  inlineClosuresMatches
)
