import { Function, Option, pipe } from "effect"
import type * as ts from "typescript"
import { makeLatestIdentityOwner } from "../makeLatestIdentityOwner.js"
import { expressionPath } from "./expressionPath.js"
import { importedMemberFromPath } from "./importBindingAt.js"

const importedMembersForChecker = (checker: ts.TypeChecker) => {
  const memberFromPath = importedMemberFromPath(checker)

  const importedMemberForExpression = (expression: ts.Expression) =>
    pipe(expressionPath(expression), Option.flatMap(memberFromPath))

  return Function.memoize(importedMemberForExpression)
}

const importedMemberOwner = makeLatestIdentityOwner(importedMembersForChecker)

export const importedMemberAt = (checker: ts.TypeChecker) => importedMemberOwner(checker)(checker)
