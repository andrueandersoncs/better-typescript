import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import type { Rule, RuleContext } from "@better-typescript/core/linter"
import { makeViolation } from "@better-typescript/core/linter"
import { astNodesIn } from "../sources/astNodesIn.js"
import { argumentConsumingCall } from "../support/argumentConsumingCall.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import { resolvedCallSignature } from "../support/resolvedCallSignature.js"
import { signatureDeclarationOption } from "../support/signatureDeclarationOption.js"
import { transparentWrapperKinds } from "../support/transparentWrapperKinds.js"

const message =
  "Avoid arrow functions outside naming, currying, and third-party callback positions. " +
  "Name this function as a top-level const and pass it by reference, currying it when it needs " +
  "values from the enclosing scope. Inline arrows are permitted only as arguments to third-party " +
  "functions. When the expression sequences several steps, prefer a generator over nesting functions."

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node => {
  const isTransparentWrapper = HashSet.has(transparentWrapperKinds, node.parent.kind)

  return isTransparentWrapper ? effectiveParent(node.parent) : node.parent
}

const sourceFileForDeclaration = (declaration: ts.Declaration) => declaration.getSourceFile()

const isExternalSourceFile = (context: RuleContext) => (sourceFile: ts.SourceFile) => {
  const external = !isProjectSourceFile(sourceFile)
  const defaultLibrary = context.program.isSourceFileDefaultLibrary(sourceFile)
  const isNotDefaultLibrary = !defaultLibrary

  return external && isNotDefaultLibrary
}

const isExternalPackageArgument = (context: RuleContext) => (node: ts.Node) =>
  pipe(
    argumentConsumingCall(node),
    Option.flatMap(resolvedCallSignature(context.checker)),
    Option.flatMap(signatureDeclarationOption),
    Option.map(sourceFileForDeclaration),
    Option.exists(isExternalSourceFile(context))
  )

const isUnsanctionedClosure =
  (externalArgument: (node: ts.Node) => boolean) => (arrow: ts.ArrowFunction) => {
    const parent = effectiveParent(arrow)
    const namedOrCurried = HashSet.has(sanctionedParentKinds, parent.kind)
    const unnamed = !namedOrCurried
    const internalArgument = !externalArgument(arrow)

    return unnamed && internalArgument
  }

const makeInlineClosureViolation = (context: RuleContext) => (arrow: ts.ArrowFunction) =>
  makeViolation({
    ruleName: "no-inline-closures",
    message,
    workspaceRoot: context.workspaceRoot,
    sourceFile: context.sourceFile,
    node: arrow.equalsGreaterThanToken
  })

const checkNoInlineClosures = (context: RuleContext) => {
  const externalArgument = isExternalPackageArgument(context)

  return pipe(
    astNodesIn(context.sourceFile),
    Array.fromIterable,
    Array.filter(ts.isArrowFunction),
    Array.filter(isUnsanctionedClosure(externalArgument)),
    Array.map(makeInlineClosureViolation(context))
  )
}

export const noInlineClosures: Rule = {
  name: "no-inline-closures",
  check: checkNoInlineClosures
}
