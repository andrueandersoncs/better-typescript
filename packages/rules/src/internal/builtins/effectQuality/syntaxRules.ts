import { Array, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { makeSubjectMatch } from "./subjectMatch.js"

const anyKeywordType = flow(
  Struct.get<ts.TypeNode, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AnyKeyword)
)

const unsafeCastFindingFromTypeNode = makeSubjectMatch("as any")

const asExpressionHasAnyType = (expression: ts.AsExpression) => anyKeywordType(expression.type)

const typeAssertionHasAnyType = (expression: ts.TypeAssertion) => anyKeywordType(expression.type)

const asExpressionUnsafeCastFinding = (expression: ts.AsExpression) =>
  unsafeCastFindingFromTypeNode(expression.type)

const typeAssertionUnsafeCastFinding = (expression: ts.TypeAssertion) =>
  unsafeCastFindingFromTypeNode(expression.type)

const unsafeCastFindings =
  (_context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const asAny = pipe(
      Option.liftPredicate(ts.isAsExpression)(node),
      Option.filter(asExpressionHasAnyType),
      Option.map(asExpressionUnsafeCastFinding)
    )

    const typeAssertionAny = pipe(
      Option.liftPredicate(ts.isTypeAssertionExpression)(node),
      Option.filter(typeAssertionHasAnyType),
      Option.map(typeAssertionUnsafeCastFinding)
    )

    return pipe(Array.make(asAny, typeAssertionAny), Array.flatMap(Option.toArray))
  }

const isTypeScriptNamespace = (node: ts.ModuleDeclaration) => {
  const hasIdentifierName = ts.isIdentifier(node.name)
  const isGlobalAugmentation = (node.flags & ts.NodeFlags.GlobalAugmentation) !== 0
  const checks = Array.make(hasIdentifierName, !isGlobalAugmentation)

  return Array.every(checks, Boolean)
}

const typescriptNamespaceFindings =
  (_context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isModuleDeclaration)(node),
      Option.filter(isTypeScriptNamespace),
      Option.map((declaration) => {
        const subject = ts.isIdentifier(declaration.name)
          ? declaration.name.text
          : declaration.name.getText()

        const targetNode = ts.isIdentifier(declaration.name) ? declaration.name : declaration

        return makeSubjectMatch(subject)(targetNode)
      }),
      Option.toArray
    )

const schemaKinds = Array.make(
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.TypeAssertionExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.FunctionDeclaration
)

const unsafeCastsScanner = makeNodeScanner(schemaKinds)(acceptsNode)(unsafeCastFindings)

export const unsafeCasts = makeRule("unsafe-casts")(unsafeCastsScanner)(
  fixedRuleMessage(
    "Avoid unchecked `as any` assertions in Effect code.",
    "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate."
  )
)

const typescriptNamespacesScanner = makeNodeScanner(schemaKinds)(acceptsNode)(
  typescriptNamespaceFindings
)

export const typescriptNamespaces = makeRule("typescript-namespaces")(typescriptNamespacesScanner)(
  fixedRuleMessage(
    "Avoid TypeScript namespaces for Effect module organization.",
    "Export an ES module namespace projection or named values instead."
  )
)
