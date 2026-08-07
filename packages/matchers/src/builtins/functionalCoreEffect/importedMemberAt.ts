import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { expressionPath } from "./expressionPath.js"
import { importedMemberFromPath } from "./importBindingAt.js"

export const importedMemberAt = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const memberFromPath = (path: readonly [ts.Identifier, ReadonlyArray<string>]) =>
    importedMemberFromPath(checker, path)

  return pipe(expressionPath(expression), Option.flatMap(memberFromPath))
}
