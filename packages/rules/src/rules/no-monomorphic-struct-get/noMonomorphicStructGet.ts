import { effectPackagePathSegments } from "../../internal/support/declarationInEffectPackage.js"
import { variableDeclarationKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { hasExportModifier } from "../../internal/support/hasExportModifier.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"
import { strictEqual } from "../../internal/equivalence.js"

// NoMonomorphicStructGetFact exists because its fields form one stable data contract used by the linter.
export const NoMonomorphicStructGetFact = Schema.Struct({})

export interface NoMonomorphicStructGetFact extends Schema.Schema.Type<
  typeof NoMonomorphicStructGetFact
> {}

// emptyNoMonomorphicStructGetFact exists because its fields form one stable data contract used by the linter.
export const emptyNoMonomorphicStructGetFact = NoMonomorphicStructGetFact.make({})

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

const monomorphicStructGetMatches = (context: MatchContext) => {
  const declarationIsExported = (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.some(declaration.parent.parent),
      Option.filter(ts.isVariableStatement),
      Option.exists(hasExportModifier)
    )

  const typeNodeIsNonGenericCallable = (typeNode: ts.TypeNode) => {
    const declaredType = context.checker.getTypeFromTypeNode(typeNode)
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
      pipe(context.checker.getSymbolAtLocation(callee.name), Option.fromNullishOr)

    const resolveAlias = (symbol: ts.Symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? context.checker.getAliasedSymbol(symbol) : symbol
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

  const matchVariableDeclaration = (declaration: ts.VariableDeclaration) =>
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

        return makeNodeMatch(typeNode, emptyNoMonomorphicStructGetFact)
      }),
      Option.toArray
    )

  return matchVariableDeclaration
}

export const noMonomorphicStructGetScanner = makeNodeScanner(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(monomorphicStructGetMatches)
