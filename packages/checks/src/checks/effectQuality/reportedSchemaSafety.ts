import { Array, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { importedEffectApiAt } from "../functionalCoreEffect/support.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const configStringNames = Array.of("string")

const anyKeywordType = flow(
  Struct.get<ts.TypeNode, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AnyKeyword)
)

const asExpressionHasAnyType = (expression: ts.AsExpression) => anyKeywordType(expression.type)

const typeAssertionHasAnyType = (expression: ts.TypeAssertion) => anyKeywordType(expression.type)

const unsafeCastFindingFromTypeNode = makeRuleFinding("unsafe-casts")("as any")

const asExpressionUnsafeCastFinding = (expression: ts.AsExpression) =>
  unsafeCastFindingFromTypeNode(expression.type)

const typeAssertionUnsafeCastFinding = (expression: ts.TypeAssertion) =>
  unsafeCastFindingFromTypeNode(expression.type)

export const unsafeCastFindings = (
  _context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
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

export const typescriptNamespaceFindings = (
  _context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isModuleDeclaration)(node),
    Option.filter(isTypeScriptNamespace),
    Option.map((declaration) => {
      const subject = ts.isIdentifier(declaration.name)
        ? declaration.name.text
        : declaration.name.getText()

      const evidence = ts.isIdentifier(declaration.name) ? declaration.name : declaration

      return makeRuleFinding("typescript-namespaces")(subject)(evidence)
    }),
    Option.toArray
  )

const callIsConfigString = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker, call.expression, "Config", configStringNames)

const configSecretFindingFromLiteral = (literal: ts.StringLiteralLike) =>
  makeRuleFinding("config-secret-redaction")(literal.text)(literal)

const configSecretFromCall =
  (sensitiveConfigKey: (key: string) => boolean) => (call: ts.CallExpression) => {
    const literalIsSensitive = (literal: ts.StringLiteralLike) => sensitiveConfigKey(literal.text)

    return pipe(
      Array.head(call.arguments),
      Option.filter(ts.isStringLiteralLike),
      Option.filter(literalIsSensitive),
      Option.map(configSecretFindingFromLiteral)
    )
  }

export const configSecretRedactionFindings = (
  context: CheckContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsConfigString(context.checker)),
    Option.flatMap(configSecretFromCall(index.policy.sensitiveConfigKey)),
    Option.toArray
  )
