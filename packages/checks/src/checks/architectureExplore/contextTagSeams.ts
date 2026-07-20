import { Array, Function, HashMap, Option, Struct, Tuple, flow, pipe, Result } from "effect"
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
  const isContextRoot = root.text === "Context"
  const isContextMember = Array.contains(contextSeamMembers, member)

  return isContextRoot && isContextMember
}

const rootIsEffectSeam = (root: ts.Identifier, member: string) => {
  const isEffectRoot = root.text === "Effect"
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
  const sameFile = node.getSourceFile() === declaration.getSourceFile()
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

const argumentEqualsCurrent = (current: ts.Node) => (argument: ts.Expression) =>
  argument === current

const argumentCallExpression = (node: ts.Node) => {
  const visit = (current: ts.Node): Option.Option<ts.CallExpression> => {
    const parent = current.parent
    const parenthesizedParent = Option.liftPredicate(ts.isParenthesizedExpression)(parent)

    const expressionIsCurrent = (expression: ts.ParenthesizedExpression) =>
      expression.expression === current

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

const accessIsLayerRoot = (access: ts.PropertyAccessExpression) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(access.expression),
    Option.exists((root) => root.text === "Layer")
  )

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
      const isReceiver = access.expression === node
      const isOf = access.name.text === "of"

      return isReceiver && isOf
    })
  )

  return Option.exists(ofAccess, (access) => {
    const callParent = Option.liftPredicate(ts.isCallExpression)(access.parent)

    return Option.exists(callParent, (call) => call.expression === access)
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
    const production = kind === "productionAdapter" ? current[0] + 1 : current[0]
    const test = kind === "testAdapter" ? current[1] + 1 : current[1]
    const consumers = kind === "consumer" ? current[2] + 1 : current[2]
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
      const symbolKey = referenceKey(candidate[1])
      const emptyCounts = emptySeamCounts()

      return Tuple.make(symbolKey, emptyCounts)
    }),
    HashMap.fromIterable
  )

  const candidateLookup = pipe(
    candidates,
    Array.map((candidate) => {
      const symbolKey = referenceKey(candidate[1])

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
                const insideDeclaration = referenceIsInsideDeclaration(candidate[0])(identifier)

                return !insideDeclaration
              }

              const updatedCountsForReference = (
                candidate: readonly [ts.ClassDeclaration, ts.Symbol]
              ) => {
                const adapter = isAdapterReference(context.checker)(identifier)

                if (adapter) {
                  const kind = fromTest ? "testAdapter" : "productionAdapter"

                  return incrementCounts(kind)(candidate[1])(current)
                }

                return incrementCounts("consumer")(candidate[1])(current)
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

    return pipe(
      index[0],
      Array.filter((candidate) => candidate[0].getSourceFile() === context.sourceFile),
      Array.map((candidate) => {
        const candidateKey = referenceKey(candidate[1])
        const counts = pipe(HashMap.get(index[1], candidateKey), Option.getOrElse(emptySeamCounts))
        const className = Option.fromNullishOr(candidate[0].name)

        const serviceName = pipe(
          className,
          Option.map(Struct.get("text")),
          Option.getOrElse(Function.constant(""))
        )

        const detectionNode = pipe(className, Option.getOrElse(Function.constant(candidate[0])))

        const data = ContextTagSeamData.make({
          serviceName,
          productionAdapterCount: counts[0],
          testAdapterCount: counts[1],
          consumerCount: counts[2]
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
