import { Option, pipe } from "effect"
import * as ts from "typescript"
import { importedEffectApiAt } from "./importedEffectApiAt.js"

export const hasEffectCallAncestor =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.Node) => {
    const visit = (current: ts.Node): boolean => {
      const matchingCall =
        ts.isCallExpression(current) &&
        importedEffectApiAt(checker)(namespace)(names)(current.expression)

      return matchingCall ? true : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    }

    return visit(node)
  }
