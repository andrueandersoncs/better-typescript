import { Option, pipe } from "effect"
import * as ts from "typescript"
import { importedMemberAt } from "./importedMemberAt.js"
import { effectApiMember } from "./effectApiMember.js"

export const importedEffectApiAt =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const effectApiMemberOf = effectApiMember(namespace)(names)

    return pipe(importedMemberAt(checker)(expression), Option.exists(effectApiMemberOf))
  }
