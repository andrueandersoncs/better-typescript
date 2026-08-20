import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { isExtendsClause } from "../../internal/support/isExtendsClause.js"
import { resolvedSymbolAt } from "../../internal/support/resolvedSymbolAt.js"
import { unwrapCallee } from "../../internal/support/unwrapCallee.js"
import { Option, Array, pipe, Struct } from "effect"

export const taggedClassSymbolNode = (expression: ts.Expression): Option.Option<ts.Node> => {
  if (ts.isPropertyAccessExpression(expression)) {
    return Option.some(expression.name)
  }

  return ts.isIdentifier(expression) ? Option.some(expression) : Option.none()
}

export const declarationComesFromEffectModule =
  (moduleSuffixes: ReadonlyArray<string>) => (declaration: ts.Declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll("\\", "/")

    return Array.some(moduleSuffixes, (suffix) => fileName.endsWith(suffix))
  }

export const symbolIsEffectTaggedClass =
  (moduleSuffixes: ReadonlyArray<string>) => (symbol: ts.Symbol) => {
    const taggedClassName = symbol.getName()
    const nameIsTaggedClass = strictEqual("TaggedClass")(taggedClassName)

    const declarations = pipe(
      symbol.getDeclarations(),
      Option.fromNullishOr,
      Option.getOrElse(() => Array.empty<ts.Declaration>())
    )

    const declarationFromEffectModule = Array.some(
      declarations,
      declarationComesFromEffectModule(moduleSuffixes)
    )

    const conditions = Array.make(nameIsTaggedClass, declarationFromEffectModule)

    return Array.every(conditions, Boolean)
  }

export const taggedClassHeritage =
  (moduleSuffixes: ReadonlyArray<string>) =>
  (checker: ts.TypeChecker) =>
  (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? Array.empty()
    const extendsClauses = Array.filter(clauses, isExtendsClause)
    const heritageTypes = Array.flatMap(extendsClauses, Struct.get("types"))

    const heritageIsEffectTaggedClass = (heritage: ts.ExpressionWithTypeArguments) =>
      pipe(
        heritage.expression,
        unwrapCallee,
        taggedClassSymbolNode,
        Option.flatMap(resolvedSymbolAt(checker)),
        Option.exists(symbolIsEffectTaggedClass(moduleSuffixes))
      )

    return Array.findFirst(heritageTypes, heritageIsEffectTaggedClass)
  }
