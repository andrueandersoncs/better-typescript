import { Option, pipe } from "effect"
import * as ts from "typescript"
import { importedEffectApiAt } from "./importedEffectApiAt.js"

export const hasEffectCallAncestor = (
  checker: ts.TypeChecker,
  node: ts.Node,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const visit = (current: ts.Node): boolean => {
    const matchingCall =
      ts.isCallExpression(current) &&
      importedEffectApiAt(checker, current.expression, namespace, names)

    return matchingCall ? true : pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return visit(node)
}
