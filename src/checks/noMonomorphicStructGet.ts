import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import {
  hasExportModifier,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const message = "Avoid monomorphizing Struct.get at its declaration."

const hint =
  "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
  "domain type on the consuming value or result rather than on the getter."

const effectPackagePathSegments: ReadonlyArray<string> = [
  "/node_modules/effect/",
  "/node_modules/@effect/"
]

const structModuleSuffixes: ReadonlyArray<string> = [
  "/Struct.d.ts",
  "/Struct.ts"
]

const declarationIsEffectStructModule = (
  declaration: ts.Declaration
): boolean => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")
  const inEffectPackage = Array.some(effectPackagePathSegments, (segment) =>
    fileName.includes(segment)
  )
  const isStructModule = Array.some(structModuleSuffixes, (suffix) =>
    fileName.endsWith(suffix)
  )

  return [inEffectPackage, isStructModule].every(Boolean)
}

const symbolDeclaredInEffectStructModule = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? []

  return Array.some(declarations, declarationIsEffectStructModule)
}

const unaliasedPropertySymbol =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

const propertyAccessResolvesToEffectStructGet =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const symbolAtName = checker.getSymbolAtLocation(access.name)

    return pipe(
      Option.fromNullable(symbolAtName),
      Option.map(unaliasedPropertySymbol(checker)),
      Option.filter((symbol) => symbol.name === "get"),
      Option.exists(symbolDeclaredInEffectStructModule)
    )
  }

const structGetCall =
  (checker: ts.TypeChecker) =>
  (initializer: ts.Expression): Option.Option<ts.CallExpression> =>
    Option.gen(function* () {
      const expression = unwrapTransparentExpression(initializer)
      const call = yield* Option.liftPredicate(ts.isCallExpression)(expression)
      const callee = yield* Option.liftPredicate(ts.isPropertyAccessExpression)(
        call.expression
      )
      yield* Option.liftPredicate(
        propertyAccessResolvesToEffectStructGet(checker)
      )(callee)

      return call
    })

// The context stage runs once per file, so every partial below is shared by all VariableDeclarations the report wiring feeds to matches.
const monomorphicStructGetMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)
  const initializerStructGetCall = structGetCall(checker)

  const declarationIsExported = (
    declaration: ts.VariableDeclaration
  ): boolean =>
    pipe(
      Option.some(declaration.parent.parent),
      Option.filter(ts.isVariableStatement),
      Option.exists(hasExportModifier)
    )

  const typeNodeIsNonGenericCallable = (typeNode: ts.TypeNode): boolean => {
    const declaredType = checker.getTypeFromTypeNode(typeNode)
    const signatures = declaredType.getCallSignatures()
    const hasCallSignature = signatures.length > 0
    const hasNoGenericSignature = !Array.some(signatures, (signature) => {
      const typeParameterCount = signature.typeParameters?.length ?? 0

      return typeParameterCount > 0
    })

    return [hasCallSignature, hasNoGenericSignature].every(Boolean)
  }

  const initializerIsGenericStructGet = (initializer: ts.Expression): boolean =>
    pipe(
      Option.gen(function* () {
        const call = yield* initializerStructGetCall(initializer)
        const resolvedSignature = checker.getResolvedSignature(call)
        const signature = yield* Option.fromNullable(resolvedSignature)
        const returnType = checker.getReturnTypeOfSignature(signature)

        return returnType.getCallSignatures()
      }),
      Option.exists((returnSignatures) =>
        Array.some(returnSignatures, (returnSignature) => {
          const typeParameterCount = returnSignature.typeParameters?.length ?? 0

          return typeParameterCount > 0
        })
      )
    )

  const matches = (
    declaration: ts.VariableDeclaration
  ): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const localDeclaration = declarationIsExported(declaration)
          ? Option.none<ts.VariableDeclaration>()
          : Option.some(declaration)
        yield* localDeclaration
        const typeNode = yield* Option.fromNullable(declaration.type)
        const initializer = yield* Option.fromNullable(declaration.initializer)
        yield* Option.liftPredicate(typeNodeIsNonGenericCallable)(typeNode)
        yield* Option.liftPredicate(initializerIsGenericStructGet)(initializer)

        return match({ node: typeNode, message, hint })
      }),
      Option.toArray
    )

  return matches
}

const check = nodeCheck([ts.SyntaxKind.VariableDeclaration])(
  ts.isVariableDeclaration
)(monomorphicStructGetMatches)

export const noMonomorphicStructGet: Check = check
