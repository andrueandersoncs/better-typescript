import { Array, Function, Iterable, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { astNodesIn } from "../sources/astNodesIn.js"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import { variableDeclarationInitializer } from "../support/variableDeclarationInitializer.js"
import { strictEqual } from "../equivalence.js"
import { optionResult } from "./optionResult.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

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

const symbolOccursThroughFunctions = (
  checker: ts.TypeChecker,
  target: ts.Symbol,
  root: ts.Node,
  seen: ReadonlyArray<ts.Symbol>
): boolean => {
  const nodeReachesTarget = (node: ts.Node) => {
    const symbolReachesTarget = (symbol: ts.Symbol) => {
      const targetMatch = strictEqual(target)(symbol)
      const isUnseenSymbol = strictEqual(symbol)
      const unseen = !Array.some(seen, isUnseenSymbol)
      const body = functionBodyForSymbol(symbol)
      const unseenBody = pipe(body, Option.filter(Function.constant(unseen)))
      const nextSeen = Array.append(seen, symbol)

      const dependencyBodyReachesTarget = (dependencyBody: ts.Node) =>
        symbolOccursThroughFunctions(checker, target, dependencyBody, nextSeen)

      const dependencyMatch = Option.exists(unseenBody, dependencyBodyReachesTarget)
      const matches = Array.make(targetMatch, dependencyMatch)

      return Array.some(matches, Boolean)
    }

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(node),
      Option.flatMap(symbolOptionAt(checker)),
      Option.exists(symbolReachesTarget)
    )
  }

  return pipe(astNodesIn(root), Iterable.some(nodeReachesTarget))
}

export const declarationRecurses =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier, root: ts.Node): boolean => {
    const targetOccursThroughRoot = (target: ts.Symbol) => {
      const seen = Array.of(target)

      return symbolOccursThroughFunctions(checker, target, root, seen)
    }

    return pipe(identifier, symbolOptionAt(checker), Option.exists(targetOccursThroughRoot))
  }
