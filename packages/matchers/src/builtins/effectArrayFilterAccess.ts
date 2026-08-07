import * as path from "node:path"
import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../support/resolvedSymbolAt.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { unwrapCallee } from "../support/unwrapCallee.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { strictEqual } from "../equivalence.js"

const effectArrayModuleFileNames = Array.make("Array.ts", "Array.d.ts")

const symbolIsFromEffectArrayModule = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  const declaredInArrayModule = Array.some(declarations, (declaration) => {
    const sourceFile = declaration.getSourceFile()
    const fileName = path.basename(sourceFile.fileName)

    return Array.contains(effectArrayModuleFileNames, fileName)
  })

  return symbolDeclaredInEffectPackage(symbol) && declaredInArrayModule
}

const propertyNameIsFilter = (access: ts.PropertyAccessExpression) =>
  strictEqual("filter")(access.name.text)

export const effectArrayFilterAccess =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.PropertyAccessExpression> => {
    const accessIsEffectArrayFilter = (access: ts.PropertyAccessExpression) =>
      pipe(resolvedSymbolAt(checker)(access.name), Option.exists(symbolIsFromEffectArrayModule))

    return pipe(
      call.expression,
      unwrapCallee,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter(propertyNameIsFilter),
      Option.filter(accessIsEffectArrayFilter)
    )
  }
