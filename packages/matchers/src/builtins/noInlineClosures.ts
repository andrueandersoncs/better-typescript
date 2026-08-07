import { Array, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { transparentWrapperKinds } from "../support/transparentWrapperKinds.js"
import { argumentConsumingCall } from "../support/argumentConsumingCall.js"
import { resolvedCallSignature } from "../support/resolvedCallSignature.js"
import { signatureDeclarationOption } from "../support/signatureDeclarationOption.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"

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

// Exclude the default library because only dependency combinators form external callback bounds.
const isExternalPackageArgument =
  (checker: ts.TypeChecker) => (program: ts.Program) => (node: ts.Node) =>
    pipe(
      argumentConsumingCall(node),
      Option.flatMap(resolvedCallSignature(checker)),
      Option.exists((signature) => {
        const declarationFile = pipe(
          signatureDeclarationOption(signature),
          Option.map((declaration) => declaration.getSourceFile())
        )

        return Option.exists(declarationFile, (sourceFile) => {
          const isExternal = !isProjectSourceFile(sourceFile)
          const isDefaultLibrary = program.isSourceFileDefaultLibrary(sourceFile)
          const ambientConditions = Array.make(isExternal, !isDefaultLibrary)
          return Array.every(ambientConditions, Boolean)
        })
      })
    )

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
