import { Array, Function, HashMap, MutableRef, Option, Struct, Tuple, flow, pipe } from "effect"
import * as ts from "typescript"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import { referenceKey } from "../support/referenceKey.js"
import type { ReferenceKey } from "../support/referenceKeyType.js"
import { variableDeclarationInitializer } from "../support/variableDeclarationInitializer.js"
import { strictEqual } from "../equivalence.js"
import { functionDependencyCache } from "./functionDependencyCache.js"
import { optionResult } from "./optionResult.js"
import { symbolOptionAt } from "./symbolOptionAt.js"
import type { SymbolReference } from "./symbolReference.js"
import { symbolReferencesIn } from "./symbolReferencesIn.js"

const emptyDeclarations = Array.empty<ts.Declaration>()

const functionDeclarationBody = (fn: ts.FunctionDeclaration) => Option.fromNullishOr(fn.body)

const functionBodyInDeclaration = (declaration: ts.Declaration) => {
  const variableBody = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap(variableDeclarationInitializer),
    Option.filter(isFunctionInitializer),
    Option.map(Struct.get("body"))
  )

  const declaredBody = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
    Option.flatMap(functionDeclarationBody)
  )

  return pipe(variableBody, Option.orElse(Function.constant(declaredBody)))
}

const functionBodyForSymbol = (symbol: ts.Symbol) =>
  pipe(
    symbol.declarations ?? emptyDeclarations,
    Array.filterMap(flow(functionBodyInDeclaration, optionResult)),
    Array.head
  )

const emptyDependencyIndex = HashMap.empty<ReferenceKey, ReadonlyArray<SymbolReference>>()

const dependencyIndexFor = (checker: ts.TypeChecker) => {
  const checkerMatches: (entry: readonly [ts.TypeChecker, unknown]) => boolean = flow(
    Tuple.get(0),
    strictEqual(checker)
  )

  return pipe(
    MutableRef.get(functionDependencyCache),
    Option.filter(checkerMatches),
    Option.map(Tuple.get(1)),
    Option.getOrElse(Function.constant(emptyDependencyIndex))
  )
}

const functionDependencies = (checker: ts.TypeChecker) => (symbol: ts.Symbol) => {
  const symbolKey = referenceKey(symbol)
  const dependencyIndex = dependencyIndexFor(checker)
  const cached = HashMap.get(dependencyIndex, symbolKey)

  if (Option.isSome(cached)) {
    return cached.value
  }

  const dependencies = pipe(
    functionBodyForSymbol(symbol),
    Option.map(symbolReferencesIn(checker)),
    Option.getOrElse(Array.empty<SymbolReference>)
  )

  const nextIndex = HashMap.set(dependencyIndex, symbolKey, dependencies)
  const cacheEntry = Tuple.make(checker, nextIndex)
  const nextCache = Option.some(cacheEntry)

  MutableRef.set(functionDependencyCache, nextCache)

  return dependencies
}

const symbolReachesTarget =
  (checker: ts.TypeChecker, targetKey: ReferenceKey, seen: HashMap.HashMap<ReferenceKey, true>) =>
  (reference: SymbolReference): boolean => {
    const targetMatch = strictEqual(targetKey)(reference.key)
    const unseen = !HashMap.has(seen, reference.key)

    if (unseen) {
      HashMap.set(seen, reference.key, true)
    }

    const dependencies = unseen
      ? functionDependencies(checker)(reference.symbol)
      : Array.empty<SymbolReference>()

    const dependencyReachesTarget = symbolReachesTarget(checker, targetKey, seen)

    return targetMatch || Array.some(dependencies, dependencyReachesTarget)
  }

export const declarationRecurses =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier, root: ts.Node): boolean => {
    const targetOccursThroughRoot = (target: ts.Symbol) => {
      const targetKey = referenceKey(target)
      const seen = pipe(HashMap.empty<ReferenceKey, true>(), HashMap.beginMutation)

      HashMap.set(seen, targetKey, true)
      const reachesTarget = symbolReachesTarget(checker, targetKey, seen)
      const rootReferences = symbolReferencesIn(checker)(root)

      return Array.some(rootReferences, reachesTarget)
    }

    return pipe(identifier, symbolOptionAt(checker), Option.exists(targetOccursThroughRoot))
  }
