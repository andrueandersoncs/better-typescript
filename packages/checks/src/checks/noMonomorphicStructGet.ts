import { Array, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { hasExportModifier, unwrapTransparentExpression } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Avoid monomorphizing Struct.get at its declaration."

const hint =
  "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
  "domain type on the consuming value or result rather than on the getter."

const effectPackagePathSegments: ReadonlyArray<string> = Array.make(
  "/node_modules/effect/",
  "/node_modules/@effect/"
)

const structModuleSuffixes: ReadonlyArray<string> = Array.make("/Struct.d.ts", "/Struct.ts")

const declarationIsEffectStructModule = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()
  const fileName = sourceFile.fileName.replaceAll("\\", "/")
  const pathIncludesSegment = (segment: string) => fileName.includes(segment)
  const pathEndsWithSuffix = (suffix: string) => fileName.endsWith(suffix)
  const inEffectPackage = Array.some(effectPackagePathSegments, pathIncludesSegment)
  const isStructModule = Array.some(structModuleSuffixes, pathEndsWithSuffix)
  const effectStructModuleConditions = Array.make(inEffectPackage, isStructModule)

  return Array.every(effectStructModuleConditions, Boolean)
}

const symbolDeclaredInEffectStructModule = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  return Array.some(declarations, declarationIsEffectStructModule)
}

const monomorphicStructGetMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const declarationIsExported = (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.some(declaration.parent.parent),
      Option.filter(ts.isVariableStatement),
      Option.exists(hasExportModifier)
    )

  const typeNodeIsNonGenericCallable = (typeNode: ts.TypeNode) => {
    const declaredType = checker.getTypeFromTypeNode(typeNode)
    const signatures = declaredType.getCallSignatures()
    const hasCallSignature = signatures.length > 0

    const signatureHasTypeParameters = (signature: ts.Signature) => {
      const typeParameterCount = signature.typeParameters?.length ?? 0

      return typeParameterCount > 0
    }

    const hasNoGenericSignature = !Array.some(signatures, signatureHasTypeParameters)
    const nonGenericCallableConditions = Array.make(hasCallSignature, hasNoGenericSignature)
    return Array.every(nonGenericCallableConditions, Boolean)
  }

  const initializerIsStructGet = (initializer: ts.Expression) => {
    const hasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)

    const symbolAtCalleeName = (callee: ts.PropertyAccessExpression) =>
      pipe(checker.getSymbolAtLocation(callee.name), Option.fromNullishOr)

    const resolveAlias = (symbol: ts.Symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(symbol) : symbol
    }

    const isGetName = flow(Struct.get<ts.Symbol, "name">("name"), strictEqual("get"))

    const structGetSymbol = (call: ts.CallExpression) =>
      pipe(
        call.expression,
        Option.liftPredicate(ts.isPropertyAccessExpression),
        Option.flatMap(symbolAtCalleeName),
        Option.map(resolveAlias),
        Option.filter(isGetName),
        Option.filter(symbolDeclaredInEffectStructModule)
      )

    return pipe(
      initializer,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(hasOneArgument),
      Option.flatMap(structGetSymbol),
      Option.isSome
    )
  }

  const matches = (declaration: ts.VariableDeclaration): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const localDeclaration = declarationIsExported(declaration)
          ? Option.none<ts.VariableDeclaration>()
          : Option.some(declaration)

        yield* localDeclaration
        const typeNode = yield* Option.fromNullishOr(declaration.type)
        const initializer = yield* Option.fromNullishOr(declaration.initializer)
        yield* Option.liftPredicate(typeNodeIsNonGenericCallable)(typeNode)
        yield* Option.liftPredicate(initializerIsStructGet)(initializer)

        return match({ node: typeNode, message, hint })
      }),
      Option.toArray
    )

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const noMonomorphicStructGet = makeCheck(
  "no-monomorphic-struct-get",
  variableDeclarationKinds,
  ts.isVariableDeclaration,
  monomorphicStructGetMatches
)
