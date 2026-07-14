import {
  Array,
  Data,
  Function,
  HashMap,
  HashSet,
  Option,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import {
  fileSubscriptions,
  withProgramIndex
} from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { SingleAdapterSeamData } from "./data.js"
import {
  foldAst,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import { hasExportModifier } from "../support/tsNode.js"
import { resolvedSymbolAt } from "../support/tsNode.js"
import { hasCallSignature } from "../support/tsType.js"
import { isTestSourceFile } from "./programSymbols.js"

/**
 * SeamCandidate binds an exported behavioural interface declaration to its
 * canonical compiler symbol.
 *
 * @modelRole shared
 * @remarks It remains explicit because candidate discovery and adapter counting
 * must preserve both syntax location and symbol identity. Removing it would
 * repeat alias resolution or split those correlated values.
 */
class SeamCandidate extends Data.Class<{
  readonly declaration: ts.InterfaceDeclaration
  readonly symbol: ts.Symbol
}> {}

/**
 * AdapterCount is the shared production-versus-test implementation tally for
 * one injected interface symbol.
 *
 * @modelRole shared
 * @remarks It remains explicit because accumulation and seam classification
 * must update and compare both populations together. Removing it would use
 * parallel maps whose entries could diverge.
 */
class AdapterCount extends Data.Class<{
  readonly production: number
  readonly test: number
}> {}

/**
 * SingleAdapterIndex is the shared candidate, injection, and implementation
 * evidence consumed by per-file seam reporting.
 *
 * @modelRole shared
 * @remarks It remains explicit because project indexing and file subscriptions
 * must exchange one internally consistent snapshot. Removing it would pass
 * three synchronized collections and risk mixing index generations.
 */
class SingleAdapterIndex extends Data.Class<{
  readonly candidates: ReadonlyArray<SeamCandidate>
  readonly injected: HashSet.HashSet<ts.Symbol>
  readonly adapterCounts: HashMap.HashMap<ts.Symbol, AdapterCount>
}> {}

/**
 * AdapterState is the accumulated injection and implementation evidence while
 * traversing project syntax.
 *
 * @modelRole shared
 * @remarks It remains explicit because the fold initializer and reducer must
 * evolve the symbol set and count map as one state transition. Removing it
 * would synchronize two mutable-looking accumulator parameters manually.
 */
class AdapterState extends Data.Class<{
  readonly injected: HashSet.HashSet<ts.Symbol>
  readonly adapterCounts: HashMap.HashMap<ts.Symbol, AdapterCount>
}> {}

const emptyAdapterCount = (): AdapterCount =>
  new AdapterCount({ production: 0, test: 0 })

const message =
  "Single-adapter seam evidence — this injected behavioural interface has one production adapter and no test adapter."

const hint =
  "One adapter is a hypothetical seam. Architecture Explore recommends removing the port until behaviour actually varies across production and test adapters."

const typeSymbol =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): Option.Option<ts.Symbol> => {
    const aliasSymbol = Option.fromNullable(type.aliasSymbol)
    const symbol = type.getSymbol()
    const directSymbol = Option.fromNullable(symbol)

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

const isBehaviouralMember =
  (checker: ts.TypeChecker) =>
  (member: ts.TypeElement): boolean => {
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
  (sourceFiles: ReadonlyArray<ts.SourceFile>): ReadonlyArray<SeamCandidate> =>
    Array.flatMap(sourceFiles, (sourceFile) =>
      Array.filterMap(sourceFile.statements, (statement) =>
        pipe(
          Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
          Option.filter(hasExportModifier),
          Option.filter((declaration) => declaration.members.length > 0),
          Option.filter((declaration) =>
            Array.every(
              declaration.members,
              isBehaviouralMember(context.checker)
            )
          ),
          Option.flatMap((declaration) =>
            pipe(
              resolvedSymbolAt(context.checker)(declaration.name),
              Option.map((symbol) => new SeamCandidate({ declaration, symbol }))
            )
          )
        )
      )
    )

const exportedVariableStatement = (
  declaration: ts.VariableDeclaration
): Option.Option<ts.VariableStatement> =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclarationList)(declaration.parent),
    Option.map(Struct.get("parent")),
    Option.filter(ts.isVariableStatement),
    Option.filter(hasExportModifier)
  )

/**
 * ClassDependencyOwner is the compiler-node protocol that may own an injected
 * constructor or method parameter.
 *
 * @modelRole protocol
 * @remarks It remains explicit because the type guard and export classifier
 * must accept the same class-member syntax. Removing it would repeat the union
 * and let their supported node kinds drift.
 */
type ClassDependencyOwner = ts.ConstructorDeclaration | ts.MethodDeclaration

const classDependencyOwnerKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.MethodDeclaration
)

const isClassDependencyOwner = (node: ts.Node): node is ClassDependencyOwner =>
  Array.contains(classDependencyOwnerKinds, node.kind)

/**
 * VariableDependencyOwner is the compiler-node protocol for exported variable
 * functions that may own injected parameters.
 *
 * @modelRole protocol
 * @remarks It remains explicit because the type guard and variable-statement
 * resolver must accept the same expression forms. Removing it would duplicate
 * the union and allow their supported syntax to diverge.
 */
type VariableDependencyOwner = ts.ArrowFunction | ts.FunctionExpression

const variableDependencyOwnerKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression
)

const isVariableDependencyOwner = (
  node: ts.Node
): node is VariableDependencyOwner =>
  Array.contains(variableDependencyOwnerKinds, node.kind)

const isExportedDependencyParameter = (
  parameter: ts.ParameterDeclaration
): boolean => {
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
      Array.filterMap(clause.types, (implemented) =>
        resolvedSymbolAt(checker)(implemented.expression)
      )
    )
  }

const contextualInterfaceSymbol =
  (checker: ts.TypeChecker) =>
  (literal: ts.ObjectLiteralExpression): Option.Option<ts.Symbol> =>
    pipe(
      checker.getContextualType(literal),
      Option.fromNullable,
      Option.flatMap(typeSymbol(checker))
    )

const incrementAdapter =
  (fromTest: boolean) =>
  (symbol: ts.Symbol) =>
  (
    counts: HashMap.HashMap<ts.Symbol, AdapterCount>
  ): HashMap.HashMap<ts.Symbol, AdapterCount> => {
    const current = pipe(
      HashMap.get(counts, symbol),
      Option.getOrElse(emptyAdapterCount)
    )

    const production = fromTest ? current.production : current.production + 1
    const test = fromTest ? current.test + 1 : current.test
    const updated = new AdapterCount({ production, test })
    return HashMap.set(counts, symbol, updated)
  }

const buildIndex = (context: ProgramContext): SingleAdapterIndex => {
  const sourceFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  const candidates = seamCandidates(context)(sourceFiles)

  const candidateSymbols = pipe(
    candidates,
    Array.map(Struct.get("symbol")),
    HashSet.fromIterable
  )

  const classifyTestSource = isTestSourceFile(context.projectRoot)

  const scanFile =
    (sourceFile: ts.SourceFile) =>
    (state: AdapterState): AdapterState => {
      const fromTest = classifyTestSource(sourceFile)

      return foldAst((current: AdapterState, node: ts.Node): AdapterState => {
        const parameterState = pipe(
          Option.liftPredicate(ts.isParameter)(node),
          Option.filter(isExportedDependencyParameter),
          Option.map((parameter) =>
            context.checker.getTypeAtLocation(parameter)
          ),
          Option.flatMap(typeSymbol(context.checker)),
          Option.filter((candidate) =>
            HashSet.has(candidateSymbols, candidate)
          ),
          Option.map((candidate) => {
            const injected = HashSet.add(current.injected, candidate)

            return new AdapterState({
              injected,
              adapterCounts: current.adapterCounts
            })
          }),
          Option.getOrElse(() => current)
        )

        const classState = pipe(
          Option.liftPredicate(ts.isClassDeclaration)(node),
          Option.map((declaration) => {
            const symbols = pipe(
              implementedSymbols(context.checker)(declaration),
              Array.filter((symbol) => HashSet.has(candidateSymbols, symbol))
            )

            const adapterCounts = Array.reduce(
              symbols,
              parameterState.adapterCounts,
              (counts, symbol) => incrementAdapter(fromTest)(symbol)(counts)
            )

            return new AdapterState({
              injected: parameterState.injected,
              adapterCounts
            })
          }),
          Option.getOrElse(Function.constant(parameterState))
        )

        const objectState = pipe(
          Option.liftPredicate(ts.isObjectLiteralExpression)(node),
          Option.flatMap(contextualInterfaceSymbol(context.checker)),
          Option.filter((candidate) =>
            HashSet.has(candidateSymbols, candidate)
          ),
          Option.map((candidate) => {
            const adapterCounts = incrementAdapter(fromTest)(candidate)(
              classState.adapterCounts
            )

            return new AdapterState({
              injected: classState.injected,
              adapterCounts
            })
          }),
          Option.getOrElse(Function.constant(classState))
        )

        return objectState
      })(sourceFile)(state)
    }

  const injected = HashSet.empty<ts.Symbol>()
  const adapterCounts = HashMap.empty<ts.Symbol, AdapterCount>()
  const initial = new AdapterState({ injected, adapterCounts })

  const finalState = Array.reduce(sourceFiles, initial, (state, sourceFile) =>
    scanFile(sourceFile)(state)
  )

  return new SingleAdapterIndex({
    candidates,
    injected: finalState.injected,
    adapterCounts: finalState.adapterCounts
  })
}

const singleAdapterElements =
  (index: SingleAdapterIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> => {
    const element = detection(context)

    return pipe(
      index.candidates,
      Array.filter(
        (candidate) =>
          candidate.declaration.getSourceFile() === context.sourceFile
      ),
      Array.filter((candidate) =>
        HashSet.has(index.injected, candidate.symbol)
      ),
      Array.filterMap((candidate) => {
        const counts = pipe(
          HashMap.get(index.adapterCounts, candidate.symbol),
          Option.getOrElse(emptyAdapterCount)
        )

        const hasOneProductionAdapter = counts.production === 1
        const hasNoTestAdapter = counts.test === 0

        const isHypothetical = hasOneProductionAdapter && hasNoTestAdapter

        const hypotheticalCandidate = isHypothetical
          ? Option.some(candidate)
          : Option.none()

        return pipe(
          hypotheticalCandidate,
          Option.map((currentCandidate) => {
            const data = new SingleAdapterSeamData({
              interfaceName: currentCandidate.declaration.name.text,
              productionAdapterCount: counts.production,
              testAdapterCount: counts.test
            })

            const reported = element({
              node: currentCandidate.declaration.name,
              message,
              hint,
              data
            })

            return reported
          })
        )
      })
    )
  }

const singleAdapterSubscriptions = Function.compose(
  singleAdapterElements,
  fileSubscriptions
)

export const singleAdapterSeams: Check = withProgramIndex(buildIndex)(
  singleAdapterSubscriptions
)
