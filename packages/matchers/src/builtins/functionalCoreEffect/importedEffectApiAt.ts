import { Option, pipe } from "effect"
import * as ts from "typescript"
import type { ImportedMember } from "./importedMember.js"
import { importedMemberAt } from "./importedMemberAt.js"
import { effectApiMember } from "./effectApiMember.js"

export const importedEffectApiAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const effectApiMemberOf = (member: ImportedMember) => effectApiMember(member, namespace, names)
  return pipe(importedMemberAt(checker, expression), Option.exists(effectApiMemberOf))
}
