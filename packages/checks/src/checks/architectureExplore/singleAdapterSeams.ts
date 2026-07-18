import { Array, Function, HashMap, HashSet, Option, Struct, Tuple, pipe, Result } from "effect"
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
  ): ReadonlyArray<readonly [ts.InterfaceDeclaration, ts.Symbol]> =>
    Array.flatMap(sourceFiles, (sourceFile) =>
      Array.filterMap(sourceFile.statements, (statement) =>
        pipe(
          Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
          Option.filter(hasExportModifier),
          Option.filter((declaration) => declaration.members.length > 0),
          Option.filter((declaration) =>
            Array.every(declaration.members, isBehaviouralMember(context.checker))
          ),
          Option.flatMap((declaration) =>
            pipe(
              resolvedSymbolAt(context.checker)(declaration.name),
              Option.map((symbol) => Tuple.make(declaration, symbol))
            )
          ),
          Result.fromOption(Function.constVoid)
        )
      )
    )

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

  const classExport = pipe(
    Option.liftPredicate(isClassDependencyOwner)(owner),
    Option.map((classMember) =>
      pipe(
        Option.liftPredicate(ts.isClassDeclaration)(classMember.parent),
        Option.exists(hasExportModifier)
      )
    )
  )

  const variableExport = pipe(
    Option.liftPredicate(isVariableDependencyOwner)(owner),
    Option.flatMap((expression) =>
      Option.liftPredicate(ts.isVariableDeclaration)(expression.parent)
    ),
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

const implementedSymbols =
  (checker: ts.TypeChecker) =>
  (declaration: ts.ClassDeclaration): ReadonlyArray<ts.Symbol> => {
    const clauses = declaration.heritageClauses ?? Array.empty()

    const implementsClauses = Array.filter(
      clauses,
      (clause) => clause.token === ts.SyntaxKind.ImplementsKeyword
    )

    return Array.flatMap(implementsClauses, (clause) =>
      Array.filterMap(clause.types, (implemented) => {
        const resolvedSymbol = resolvedSymbolAt(checker)(implemented.expression)

        return Result.fromOption(resolvedSymbol, Function.constVoid)
      })
    )
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
    const production = fromTest ? current[0] : current[0] + 1
    const test = fromTest ? current[1] + 1 : current[1]
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

  const candidateSymbols = pipe(
    candidates,
    Array.map((candidate) => referenceKey(candidate[1])),
    HashSet.fromIterable
  )

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
              const injected = HashSet.add(current[0], candidateKey)

              return Tuple.make(injected, current[1])
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

              const adapterCounts = Array.reduce(symbols, parameterState[1], (counts, symbol) =>
                incrementAdapter(fromTest)(symbol)(counts)
              )

              return Tuple.make(parameterState[0], adapterCounts)
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
              const adapterCounts = incrementAdapter(fromTest)(candidate)(classState[1])

              return Tuple.make(classState[0], adapterCounts)
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

  return Tuple.make(candidates, finalState[0], finalState[1])
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

    return pipe(
      index[0],
      Array.filter((candidate) => candidate[0].getSourceFile() === context.sourceFile),
      Array.filter((candidate) => {
        const candidateKey = referenceKey(candidate[1])

        return HashSet.has(index[1], candidateKey)
      }),
      Array.filterMap((candidate) => {
        const candidateKey = referenceKey(candidate[1])

        const counts = pipe(
          HashMap.get(index[2], candidateKey),
          Option.getOrElse(emptyAdapterCount)
        )

        const hasOneProductionAdapter = counts[0] === 1
        const hasNoTestAdapter = counts[1] === 0
        const isHypothetical = hasOneProductionAdapter && hasNoTestAdapter
        const hypotheticalCandidate = isHypothetical ? Option.some(candidate) : Option.none()

        return pipe(
          hypotheticalCandidate,
          Option.map((currentCandidate) => {
            const data = SingleAdapterSeamData.make({
              interfaceName: currentCandidate[0].name.text,
              productionAdapterCount: counts[0],
              testAdapterCount: counts[1]
            })

            const reported = element({
              node: currentCandidate[0].name,
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
