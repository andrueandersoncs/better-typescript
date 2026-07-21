import {
  Array,
  Equivalence,
  Function,
  HashMap,
  Option,
  Struct,
  Tuple,
  flow,
  pipe,
  Result
} from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import * as ts from "typescript"
import { foldAst, isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { makeSilentCheck, withProgramIndex } from "../../defineCheck.js"
import { contextTagSeamsName } from "./names.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { ContextTagSeamData } from "./data.js"
import {
  classDeclarationName,
  isExtendsClause,
  resolvedSymbolAt,
  unwrapCallee
} from "../support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { isTestSourceFile } from "./programSymbols.js"
import { type ReferenceKey, referenceKey } from "../support/referenceKey.js"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"

const emptySeamCounts = (): readonly [number, number, number] => Tuple.make(0, 0, 0)

const message =
  "Context-tag seam evidence — this Effect service key has production adapters, test adapters, and consumers."

const hint =
  "Architecture Explore uses adapter and consumer counts to judge whether an Effect seam earns its keep; counts alone are not a defect."

const contextSeamMembers: ReadonlyArray<string> = Array.make("Tag", "Service", "Reference")

const effectSeamMembers: ReadonlyArray<string> = Array.make("Service")

const effectRootSymbol = (checker: ts.TypeChecker) => (access: ts.PropertyAccessExpression) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(access.expression),
    Option.flatMap(resolvedSymbolAt(checker)),
    Option.filter(symbolDeclaredInEffectPackage)
  )

const rootIsContextSeam = (root: ts.Identifier, member: string) => {
  const isContextRoot = strictEqual("Context")(root.text)
  const isContextMember = Array.contains(contextSeamMembers, member)

  return isContextRoot && isContextMember
}

const rootIsEffectSeam = (root: ts.Identifier, member: string) => {
  const isEffectRoot = strictEqual("Effect")(root.text)
  const isEffectMember = Array.contains(effectSeamMembers, member)

  return isEffectRoot && isEffectMember
}

const accessNamesSeamApi = (access: ts.PropertyAccessExpression) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(access.expression),
    Option.exists((root) => {
      const member = access.name.text
      const contextSeam = rootIsContextSeam(root, member)
      const effectSeam = rootIsEffectSeam(root, member)

      return contextSeam || effectSeam
    })
  )

const isContextOrEffectSeamAccess = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapCallee,
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(accessNamesSeamApi),
    Option.flatMap(effectRootSymbol(checker)),
    Option.isSome
  )

const seamHeritageExpression = (declaration: ts.ClassDeclaration): Option.Option<ts.Expression> => {
  const clauses = declaration.heritageClauses ?? Array.empty()
  const extendsClauses = Array.filter(clauses, isExtendsClause)
  const heritageTypes = Array.flatMap(extendsClauses, Struct.get("types"))

  return pipe(
    Array.head(heritageTypes),
    Option.map(Struct.get("expression")),
    Option.filter(ts.isCallExpression)
  )
}

const isSeamClassDeclaration = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
  pipe(seamHeritageExpression(declaration), Option.exists(isContextOrEffectSeamAccess(checker)))

const hasClassName = Function.flow(classDeclarationName, Option.isSome)

const namedClassDeclaration = (statement: ts.Statement) =>
  pipe(Option.liftPredicate(ts.isClassDeclaration)(statement), Option.filter(hasClassName))

const seamCandidates =
  (context: ProgramContext) =>
  (
    sourceFiles: ReadonlyArray<ts.SourceFile>
  ): ReadonlyArray<readonly [ts.ClassDeclaration, ts.Symbol]> => {
    const classifyTestSource = isTestSourceFile(context.workspaceRoot)
    const isSeamClass = isSeamClassDeclaration(context.checker)
    const resolveSymbol = resolvedSymbolAt(context.checker)

    const pairWithSymbol = (declaration: ts.ClassDeclaration) => (symbol: ts.Symbol) =>
      Tuple.make(declaration, symbol)

    const classWithSymbol = (declaration: ts.ClassDeclaration) =>
      pipe(
        Option.fromNullishOr(declaration.name),
        Option.flatMap(resolveSymbol),
        Option.map(pairWithSymbol(declaration))
      )

    const candidateFromStatement = (statement: ts.Statement) =>
      pipe(
        namedClassDeclaration(statement),
        Option.filter(isSeamClass),
        Option.flatMap(classWithSymbol),
        Result.fromOption(Function.constVoid)
      )

    const candidatesInSourceFile = (sourceFile: ts.SourceFile) =>
      classifyTestSource(sourceFile)
        ? Array.empty<readonly [ts.ClassDeclaration, ts.Symbol]>()
        : Array.filterMap(sourceFile.statements, candidateFromStatement)

    return Array.flatMap(sourceFiles, candidatesInSourceFile)
  }

const ancestorMatching =
  (predicate: (node: ts.Node) => boolean) =>
  (node: ts.Node): Option.Option<ts.Node> => {
    const visit = (current: ts.Node): Option.Option<ts.Node> => {
      const matched = Option.liftPredicate(predicate)(current)
      const parent = current.parent
      const atSourceFile = ts.isSourceFile(parent)

      return pipe(
        matched,
        Option.orElse(() => (atSourceFile ? Option.none() : visit(parent)))
      )
    }

    return visit(node.parent)
  }

const referenceIsInsideDeclaration = (declaration: ts.Node) => (node: ts.Node) => {
  const nodeSourceFile = node.getSourceFile()
  const declarationSourceFile = declaration.getSourceFile()
  const sameFile = strictEqual(declarationSourceFile)(nodeSourceFile)
  const afterStart = node.pos >= declaration.pos
  const beforeEnd = node.end <= declaration.end
  const checks = Array.make(sameFile, afterStart, beforeEnd)

  return Array.every(checks, Boolean)
}

const isImportDeclarationAncestor = flow(ancestorMatching(ts.isImportDeclaration), Option.isSome)

const isTypeNodeAncestor = (current: ts.Node): boolean => {
  const typeReference = ts.isTypeReferenceNode(current)
  const typeQuery = ts.isTypeQueryNode(current)

  return typeReference || typeQuery
}

const isTypePositionReference = flow(ancestorMatching(isTypeNodeAncestor), Option.isSome)

const isNotImportDeclarationAncestor = (identifier: ts.Identifier) =>
  !isImportDeclarationAncestor(identifier)

const isNotTypePositionReference = (identifier: ts.Identifier) =>
  !isTypePositionReference(identifier)

const nodeStrictEqual = Equivalence.strictEqual<ts.Node>()

const argumentEqualsCurrent = (current: ts.Node) => (argument: ts.Expression) =>
  nodeStrictEqual(argument, current)

const argumentCallExpression = (node: ts.Node) => {
  const visit = (current: ts.Node): Option.Option<ts.CallExpression> => {
    const parent = current.parent
    const parenthesizedParent = Option.liftPredicate(ts.isParenthesizedExpression)(parent)

    const expressionIsCurrent = flow(
      Struct.get<ts.ParenthesizedExpression, "expression">("expression"),
      strictEqual(current)
    )

    const unwrapParenthesis = Option.exists(parenthesizedParent, expressionIsCurrent)

    if (unwrapParenthesis) {
      return visit(parent)
    }

    const callParent = Option.liftPredicate(ts.isCallExpression)(parent)
    const equalsCurrent = argumentEqualsCurrent(current)

    const callHasCurrentArgument = (call: ts.CallExpression) =>
      Array.some(call.arguments, equalsCurrent)

    return pipe(callParent, Option.filter(callHasCurrentArgument))
  }

  return visit(node)
}

const accessIsLayerRoot = (access: ts.PropertyAccessExpression) => {
  const identifierTextIsLayer = flow(
    Struct.get<ts.Identifier, "text">("text"),
    strictEqual("Layer")
  )

  return pipe(
    Option.liftPredicate(ts.isIdentifier)(access.expression),
    Option.exists(identifierTextIsLayer)
  )
}

const isLayerPropertyCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression),
    Option.filter(accessIsLayerRoot),
    Option.flatMap(effectRootSymbol(checker)),
    Option.isSome
  )

const isTagOfCall = (node: ts.Identifier) => {
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent)

  const ofAccess = pipe(
    propertyAccess,
    Option.filter((access) => {
      const isReceiver = strictEqual(node)(access.expression)
      const isOf = strictEqual("of")(access.name.text)

      return isReceiver && isOf
    })
  )

  return Option.exists(ofAccess, (access) => {
    const callExpressionIsAccess = flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      strictEqual(access)
    )

    const callParent = Option.liftPredicate(ts.isCallExpression)(access.parent)

    return Option.exists(callParent, callExpressionIsAccess)
  })
}

const isAdapterReference = (checker: ts.TypeChecker) => (identifier: ts.Identifier) => {
  const layerCall = argumentCallExpression(identifier)
  const layerAdapter = Option.exists(layerCall, isLayerPropertyCall(checker))
  const tagOfAdapter = isTagOfCall(identifier)

  return layerAdapter || tagOfAdapter
}

const incrementCounts =
  (kind: "productionAdapter" | "testAdapter" | "consumer") =>
  (symbol: ts.Symbol) =>
  (
    counts: HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]>
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]> => {
    const symbolKey = referenceKey(symbol)
    const current = pipe(HashMap.get(counts, symbolKey), Option.getOrElse(emptySeamCounts))
    const productionCount = Tuple.get(current, 0)
    const testCount = Tuple.get(current, 1)
    const consumerCount = Tuple.get(current, 2)
    const isProductionAdapter = strictEqual("productionAdapter")(kind)
    const isTestAdapter = strictEqual("testAdapter")(kind)
    const isConsumer = strictEqual("consumer")(kind)
    const production = isProductionAdapter ? productionCount + 1 : productionCount
    const test = isTestAdapter ? testCount + 1 : testCount
    const consumers = isConsumer ? consumerCount + 1 : consumerCount
    const updated = Tuple.make(production, test, consumers)

    return HashMap.set(counts, symbolKey, updated)
  }

const buildIndex = (
  context: ProgramContext
): readonly [
  ReadonlyArray<readonly [ts.ClassDeclaration, ts.Symbol]>,
  HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]>
] => {
  const sourceFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const candidates = seamCandidates(context)(sourceFiles)

  const candidateCounts = pipe(
    candidates,
    Array.map((candidate) => {
      const candidateSymbol = Tuple.get(candidate, 1)
      const symbolKey = referenceKey(candidateSymbol)
      const emptyCounts = emptySeamCounts()

      return Tuple.make(symbolKey, emptyCounts)
    }),
    HashMap.fromIterable
  )

  const candidateLookup = pipe(
    candidates,
    Array.map((candidate) => {
      const candidateSymbol = Tuple.get(candidate, 1)
      const symbolKey = referenceKey(candidateSymbol)

      return Tuple.make(symbolKey, candidate)
    }),
    HashMap.fromIterable
  )

  const classifyTestSource = isTestSourceFile(context.workspaceRoot)

  const scanFile =
    (sourceFile: ts.SourceFile) =>
    (
      counts: HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]>
    ): HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]> => {
      const fromTest = classifyTestSource(sourceFile)

      return foldAst(
        (
          current: HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]>,
          node: ts.Node
        ): HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]> =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.filter(isNotImportDeclarationAncestor),
            Option.filter(isNotTypePositionReference),
            Option.flatMap((identifier) => {
              const lookupCandidate = (symbol: ts.Symbol) => {
                const symbolKey = referenceKey(symbol)

                return HashMap.get(candidateLookup, symbolKey)
              }

              const outsideDeclaration = (candidate: readonly [ts.ClassDeclaration, ts.Symbol]) => {
                const declaration = Tuple.get(candidate, 0)
                const insideDeclaration = referenceIsInsideDeclaration(declaration)(identifier)

                return !insideDeclaration
              }

              const updatedCountsForReference = (
                candidate: readonly [ts.ClassDeclaration, ts.Symbol]
              ) => {
                const candidateSymbol = Tuple.get(candidate, 1)
                const adapter = isAdapterReference(context.checker)(identifier)

                if (adapter) {
                  const kind = fromTest ? "testAdapter" : "productionAdapter"

                  return incrementCounts(kind)(candidateSymbol)(current)
                }

                return incrementCounts("consumer")(candidateSymbol)(current)
              }

              return pipe(
                resolvedSymbolAt(context.checker)(identifier),
                Option.flatMap(lookupCandidate),
                Option.filter(outsideDeclaration),
                Option.map(updatedCountsForReference)
              )
            }),
            Option.getOrElse(Function.constant(current))
          )
      )(sourceFile)(counts)
    }

  const counts = Array.reduce(sourceFiles, candidateCounts, (current, sourceFile) =>
    scanFile(sourceFile)(current)
  )

  return Tuple.make(candidates, counts)
}

const contextTagSeamElements =
  (
    index: readonly [
      ReadonlyArray<readonly [ts.ClassDeclaration, ts.Symbol]>,
      HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number, number]>
    ]
  ) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const element = makeDetection(context)
    const candidates = Tuple.get(index, 0)
    const countIndex = Tuple.get(index, 1)

    return pipe(
      candidates,
      Array.filter((candidate) => {
        const declaration = Tuple.get(candidate, 0)
        const declarationSourceFile = declaration.getSourceFile()

        return strictEqual(context.sourceFile)(declarationSourceFile)
      }),
      Array.map((candidate) => {
        const declaration = Tuple.get(candidate, 0)
        const candidateSymbol = Tuple.get(candidate, 1)
        const candidateKey = referenceKey(candidateSymbol)

        const counts = pipe(
          HashMap.get(countIndex, candidateKey),
          Option.getOrElse(emptySeamCounts)
        )

        const className = Option.fromNullishOr(declaration.name)

        const serviceName = pipe(
          className,
          Option.map(Struct.get("text")),
          Option.getOrElse(Function.constant(""))
        )

        const detectionNode = pipe(className, Option.getOrElse(Function.constant(declaration)))
        const productionAdapterCount = Tuple.get(counts, 0)
        const testAdapterCount = Tuple.get(counts, 1)
        const consumerCount = Tuple.get(counts, 2)

        const data = ContextTagSeamData.make({
          serviceName,
          productionAdapterCount,
          testAdapterCount,
          consumerCount
        })

        return element({
          node: detectionNode,
          message,
          hint,
          data
        })
      })
    )
  }

const contextTagSeamSubscriptions = Function.compose(contextTagSeamElements, fileSubscriptions)

const contextTagSeamCheck = withProgramIndex(buildIndex)(contextTagSeamSubscriptions)

export const contextTagSeams = makeSilentCheck(contextTagSeamsName, contextTagSeamCheck)
