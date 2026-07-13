import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import {
  hasExportModifier,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const message = "Avoid monomorphizing Struct.get at its declaration."

const hint =
  "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
  "domain type on the consuming value or result rather than on the getter."

const effectPackagePathSegments: ReadonlyArray<string> = Array.make(
  "/node_modules/effect/",
  "/node_modules/@effect/"
)

const structModuleSuffixes: ReadonlyArray<string> = Array.make(
  "/Struct.d.ts",
  "/Struct.ts"
)

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

  const effectStructModuleConditions = Array.make(
    inEffectPackage,
    isStructModule
  )

  return Array.every(effectStructModuleConditions, Boolean)
}

const symbolDeclaredInEffectStructModule = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  return Array.some(declarations, declarationIsEffectStructModule)
}

const monomorphicStructGetMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

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

    const nonGenericCallableConditions = Array.make(
      hasCallSignature,
      hasNoGenericSignature
    )

    return Array.every(nonGenericCallableConditions, Boolean)
  }

  const initializerIsGenericStructGet = (initializer: ts.Expression): boolean =>
    pipe(
      Option.gen(function* () {
        const expression = unwrapTransparentExpression(initializer)

        const call = yield* Option.liftPredicate(ts.isCallExpression)(
          expression
        )

        const callee = yield* Option.liftPredicate(
          ts.isPropertyAccessExpression
        )(call.expression)

        const symbolAtName = checker.getSymbolAtLocation(callee.name)
        yield* pipe(
          Option.fromNullable(symbolAtName),
          Option.map((symbol) => {
            const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

            return isAlias ? checker.getAliasedSymbol(symbol) : symbol
          }),
          Option.filter((symbol) => symbol.name === "get"),
          Option.filter(symbolDeclaredInEffectStructModule)
        )
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

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

const check = nodeCheck(variableDeclarationKinds)(ts.isVariableDeclaration)(
  monomorphicStructGetMatches
)

export const noMonomorphicStructGet: Check = check

export const noMonomorphicStructGetExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-monomorphic-struct-get")
