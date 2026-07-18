import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { importedEffectApiAt } from "../functionalCoreEffect/support.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { makeRuleFinding } from "./makeFindings.js"

const configStringNames = Array.of("string")

const anyKeywordType = (typeNode: ts.TypeNode) => typeNode.kind === ts.SyntaxKind.AnyKeyword

export const unsafeCastFindings = (
  _context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const asAny = pipe(
    Option.liftPredicate(ts.isAsExpression)(node),
    Option.filter((expression) => anyKeywordType(expression.type)),
    Option.map((expression) => makeRuleFinding("unsafe-casts")("as any")(expression.type))
  )

  const typeAssertionAny = pipe(
    Option.liftPredicate(ts.isTypeAssertionExpression)(node),
    Option.filter((expression) => anyKeywordType(expression.type)),
    Option.map((expression) => makeRuleFinding("unsafe-casts")("as any")(expression.type))
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

export const configSecretRedactionFindings = (
  context: CheckContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter((call) =>
      importedEffectApiAt(context.checker, call.expression, "Config", configStringNames)
    ),
    Option.flatMap((call) =>
      pipe(
        Array.head(call.arguments),
        Option.filter(ts.isStringLiteralLike),
        Option.filter((literal) => index.policy.sensitiveConfigKey(literal.text)),
        Option.map((literal) => makeRuleFinding("config-secret-redaction")(literal.text)(literal))
      )
    ),
    Option.toArray
  )
