import { Array, Function, HashMap, HashSet, Option, Struct, Tuple, pipe, Result } from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import * as ts from "typescript"
import { withProgramIndex } from "../../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { SingleAdapterSeamData } from "./data.js"
import { foldAst, isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { hasExportModifier } from "../support/tsNode.js"
import { resolvedSymbolAt } from "../support/tsNode.js"
import { hasCallSignature } from "../support/tsType.js"
import { isTestSourceFile } from "./programSymbols.js"
import { type ReferenceKey, referenceKey } from "../support/referenceKey.js"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"
import { makeSilentCheck } from "../../defineCheck.js"
import { singleAdapterSeamsName } from "./names.js"

const emptyAdapterCount = (): readonly [number, number] => Tuple.make(0, 0)

const message =
  "Single-adapter seam evidence — this injected behavioural interface has one production adapter and no test adapter."

const hint =
  "One adapter is a hypothetical seam. Architecture Explore recommends removing the port until behaviour actually varies across production and test adapters."

const typeSymbol = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const aliasSymbol = Option.fromNullishOr(type.aliasSymbol)
  const symbol = type.getSymbol()
  const directSymbol = Option.fromNullishOr(symbol)

  return pipe(
    aliasSymbol,
    Option.orElse(Function.constant(directSymbol)),
    Option.map((symbol) => {
      const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

      return isAlias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )
}

const behaviouralSignatureKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature
)

const isBehaviouralMember = (checker: ts.TypeChecker) => (member: ts.TypeElement) => {
  const isSignature = Array.contains(behaviouralSignatureKinds, member.kind)
  const acceptsCall = hasCallSignature(checker)

  const callableProperty = pipe(
    Option.liftPredicate(ts.isPropertySignature)(member),
    Option.map((property) => checker.getTypeAtLocation(property)),
    Option.exists(acceptsCall)
  )

  return isSignature || callableProperty
}

const seamCandidates =
  (context: ProgramContext) =>
  (
    sourceFiles: ReadonlyArray<ts.SourceFile>
  ): ReadonlyArray<readonly [ts.InterfaceDeclaration, ts.Symbol]> => {
    const isBehavioural = isBehaviouralMember(context.checker)
    const resolveSymbol = resolvedSymbolAt(context.checker)

    const hasBehaviouralMembers = (declaration: ts.InterfaceDeclaration) =>
      Array.every(declaration.members, isBehavioural)

    const pairWithSymbol = (declaration: ts.InterfaceDeclaration) => (symbol: ts.Symbol) =>
      Tuple.make(declaration, symbol)

    const interfaceWithSymbol = (declaration: ts.InterfaceDeclaration) =>
      pipe(resolveSymbol(declaration.name), Option.map(pairWithSymbol(declaration)))

    const candidateFromStatement = (statement: ts.Statement) =>
      pipe(
        Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
        Option.filter(hasExportModifier),
        Option.filter((declaration) => declaration.members.length > 0),
        Option.filter(hasBehaviouralMembers),
        Option.flatMap(interfaceWithSymbol),
        Result.fromOption(Function.constVoid)
      )

    const candidatesInSourceFile = (sourceFile: ts.SourceFile) =>
      Array.filterMap(sourceFile.statements, candidateFromStatement)

    return Array.flatMap(sourceFiles, candidatesInSourceFile)
  }

const exportedVariableStatement = (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclarationList)(declaration.parent),
    Option.map(Struct.get("parent")),
    Option.filter(ts.isVariableStatement),
    Option.filter(hasExportModifier)
  )

const classDependencyOwnerKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.MethodDeclaration
)

const isClassDependencyOwner = (
  node: ts.Node
): node is ts.ConstructorDeclaration | ts.MethodDeclaration =>
  Array.contains(classDependencyOwnerKinds, node.kind)

const variableDependencyOwnerKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression
)

const isVariableDependencyOwner = (
  node: ts.Node
): node is ts.ArrowFunction | ts.FunctionExpression =>
  Array.contains(variableDependencyOwnerKinds, node.kind)

const isExportedDependencyParameter = (parameter: ts.ParameterDeclaration) => {
  const owner = parameter.parent

  const functionExport = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(owner),
    Option.map(hasExportModifier)
  )

  const classMemberIsExported = (classMember: ts.ConstructorDeclaration | ts.MethodDeclaration) =>
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(classMember.parent),
      Option.exists(hasExportModifier)
    )

  const classExport = pipe(
    Option.liftPredicate(isClassDependencyOwner)(owner),
    Option.map(classMemberIsExported)
  )

  const variableDeclarationParent = (expression: ts.ArrowFunction | ts.FunctionExpression) =>
    Option.liftPredicate(ts.isVariableDeclaration)(expression.parent)

  const variableExport = pipe(
    Option.liftPredicate(isVariableDependencyOwner)(owner),
    Option.flatMap(variableDeclarationParent),
    Option.flatMap(exportedVariableStatement),
    Option.map(Function.constant(true))
  )

  return pipe(
    functionExport,
    Option.orElse(Function.constant(classExport)),
    Option.orElse(Function.constant(variableExport)),
    Option.getOrElse(Function.constant(false))
  )
}

const implementedFromClause = (checker: ts.TypeChecker) => (clause: ts.HeritageClause) =>
  Array.filterMap(clause.types, (implemented) => {
    const resolvedSymbol = resolvedSymbolAt(checker)(implemented.expression)

    return Result.fromOption(resolvedSymbol, Function.constVoid)
  })

const implementedSymbols =
  (checker: ts.TypeChecker) =>
  (declaration: ts.ClassDeclaration): ReadonlyArray<ts.Symbol> => {
    const clauses = declaration.heritageClauses ?? Array.empty()
    const resolveImplemented = implementedFromClause(checker)

    const isImplementsClause = (clause: ts.HeritageClause) =>
      strictEqual(clause.token, ts.SyntaxKind.ImplementsKeyword)

    const implementsClauses = Array.filter(clauses, isImplementsClause)

    return Array.flatMap(implementsClauses, resolveImplemented)
  }

const contextualInterfaceSymbol =
  (checker: ts.TypeChecker) => (literal: ts.ObjectLiteralExpression) =>
    pipe(
      checker.getContextualType(literal),
      Option.fromNullishOr,
      Option.flatMap(typeSymbol(checker))
    )

const incrementAdapter =
  (fromTest: boolean) =>
  (symbol: ts.Symbol) =>
  (
    counts: HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]> => {
    const symbolKey = referenceKey(symbol)
    const current = pipe(HashMap.get(counts, symbolKey), Option.getOrElse(emptyAdapterCount))
    const productionCount = Tuple.get(current, 0)
    const testCount = Tuple.get(current, 1)
    const production = fromTest ? productionCount : productionCount + 1
    const test = fromTest ? testCount + 1 : testCount
    const updated = Tuple.make(production, test)

    return HashMap.set(counts, symbolKey, updated)
  }

const buildIndex = (
  context: ProgramContext
): readonly [
  ReadonlyArray<readonly [ts.InterfaceDeclaration, ts.Symbol]>,
  HashSet.HashSet<ReferenceKey<ts.Symbol>>,
  HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
] => {
  const sourceFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const candidates = seamCandidates(context)(sourceFiles)

  const candidateSymbolKey = (candidate: readonly [ts.InterfaceDeclaration, ts.Symbol]) =>
    pipe(candidate, Tuple.get(1), referenceKey)

  const candidateSymbols = pipe(candidates, Array.map(candidateSymbolKey), HashSet.fromIterable)
  const classifyTestSource = isTestSourceFile(context.workspaceRoot)

  const scanFile =
    (sourceFile: ts.SourceFile) =>
    (
      state: readonly [
        HashSet.HashSet<ReferenceKey<ts.Symbol>>,
        HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
      ]
    ): readonly [
      HashSet.HashSet<ReferenceKey<ts.Symbol>>,
      HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
    ] => {
      const fromTest = classifyTestSource(sourceFile)

      return foldAst(
        (
          current: readonly [
            HashSet.HashSet<ReferenceKey<ts.Symbol>>,
            HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
          ],
          node: ts.Node
        ): readonly [
          HashSet.HashSet<ReferenceKey<ts.Symbol>>,
          HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
        ] => {
          const parameterState = pipe(
            Option.liftPredicate(ts.isParameter)(node),
            Option.filter(isExportedDependencyParameter),
            Option.map((parameter) => context.checker.getTypeAtLocation(parameter)),
            Option.flatMap(typeSymbol(context.checker)),
            Option.filter((candidate) => {
              const candidateKey = referenceKey(candidate)

              return HashSet.has(candidateSymbols, candidateKey)
            }),
            Option.map((candidate) => {
              const candidateKey = referenceKey(candidate)
              const injectedSet = Tuple.get(current, 0)
              const adapterCounts = Tuple.get(current, 1)
              const injected = HashSet.add(injectedSet, candidateKey)

              return Tuple.make(injected, adapterCounts)
            }),
            Option.getOrElse(() => current)
          )

          const classState = pipe(
            Option.liftPredicate(ts.isClassDeclaration)(node),
            Option.map((declaration) => {
              const symbols = pipe(
                implementedSymbols(context.checker)(declaration),
                Array.filter((symbol) => {
                  const symbolKey = referenceKey(symbol)

                  return HashSet.has(candidateSymbols, symbolKey)
                })
              )

              const injectedSet = Tuple.get(parameterState, 0)
              const currentAdapterCounts = Tuple.get(parameterState, 1)

              const adapterCounts = Array.reduce(symbols, currentAdapterCounts, (counts, symbol) =>
                incrementAdapter(fromTest)(symbol)(counts)
              )

              return Tuple.make(injectedSet, adapterCounts)
            }),
            Option.getOrElse(Function.constant(parameterState))
          )

          const objectState = pipe(
            Option.liftPredicate(ts.isObjectLiteralExpression)(node),
            Option.flatMap(contextualInterfaceSymbol(context.checker)),
            Option.filter((candidate) => {
              const candidateKey = referenceKey(candidate)

              return HashSet.has(candidateSymbols, candidateKey)
            }),
            Option.map((candidate) => {
              const injectedSet = Tuple.get(classState, 0)
              const currentAdapterCounts = Tuple.get(classState, 1)
              const adapterCounts = incrementAdapter(fromTest)(candidate)(currentAdapterCounts)

              return Tuple.make(injectedSet, adapterCounts)
            }),
            Option.getOrElse(Function.constant(classState))
          )

          return objectState
        }
      )(sourceFile)(state)
    }

  const injected = HashSet.empty<ReferenceKey<ts.Symbol>>()
  const adapterCounts = HashMap.empty<ReferenceKey<ts.Symbol>, readonly [number, number]>()

  const initial: readonly [
    HashSet.HashSet<ReferenceKey<ts.Symbol>>,
    HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
  ] = Tuple.make(injected, adapterCounts)

  const finalState = pipe(
    sourceFiles,
    Array.reduce(initial, (state, sourceFile) => scanFile(sourceFile)(state))
  )

  const finalInjected = Tuple.get(finalState, 0)
  const finalAdapterCounts = Tuple.get(finalState, 1)

  return Tuple.make(candidates, finalInjected, finalAdapterCounts)
}

const singleAdapterElements =
  (
    index: readonly [
      ReadonlyArray<readonly [ts.InterfaceDeclaration, ts.Symbol]>,
      HashSet.HashSet<ReferenceKey<ts.Symbol>>,
      HashMap.HashMap<ReferenceKey<ts.Symbol>, readonly [number, number]>
    ]
  ) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const element = makeDetection(context)
    const candidates = Tuple.get(index, 0)
    const injected = Tuple.get(index, 1)
    const adapterCounts = Tuple.get(index, 2)

    return pipe(
      candidates,
      Array.filter((candidate) => {
        const declaration = Tuple.get(candidate, 0)
        const declarationSourceFile = declaration.getSourceFile()

        return strictEqual(declarationSourceFile, context.sourceFile)
      }),
      Array.filter((candidate) => {
        const candidateSymbol = Tuple.get(candidate, 1)
        const candidateKey = referenceKey(candidateSymbol)

        return HashSet.has(injected, candidateKey)
      }),
      Array.filterMap((candidate) => {
        const candidateSymbol = Tuple.get(candidate, 1)
        const candidateKey = referenceKey(candidateSymbol)

        const counts = pipe(
          HashMap.get(adapterCounts, candidateKey),
          Option.getOrElse(emptyAdapterCount)
        )

        const productionAdapterCount = Tuple.get(counts, 0)
        const testAdapterCount = Tuple.get(counts, 1)
        const hasOneProductionAdapter = strictEqual(productionAdapterCount, 1)
        const hasNoTestAdapter = strictEqual(testAdapterCount, 0)
        const isHypothetical = hasOneProductionAdapter && hasNoTestAdapter
        const hypotheticalCandidate = isHypothetical ? Option.some(candidate) : Option.none()

        return pipe(
          hypotheticalCandidate,
          Option.map((currentCandidate) => {
            const currentDeclaration = Tuple.get(currentCandidate, 0)

            const data = SingleAdapterSeamData.make({
              interfaceName: currentDeclaration.name.text,
              productionAdapterCount,
              testAdapterCount
            })

            const reported = element({
              node: currentDeclaration.name,
              message,
              hint,
              data
            })

            return reported
          }),
          Result.fromOption(Function.constVoid)
        )
      })
    )
  }

const singleAdapterSubscriptions = Function.compose(singleAdapterElements, fileSubscriptions)

const singleAdapterSeamCheck = withProgramIndex(buildIndex)(singleAdapterSubscriptions)

export const singleAdapterSeams = makeSilentCheck(singleAdapterSeamsName, singleAdapterSeamCheck)
