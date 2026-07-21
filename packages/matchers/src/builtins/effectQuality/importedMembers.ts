import { Array, Function, Option, pipe } from "effect"
import type { ImportedMember } from "../functionalCoreEffect/importedMembers.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

export const memberLastName = (member: ImportedMember) =>
  pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

export const memberSubject = (member: ImportedMember) => {
  const path = Array.join(member.path, ".")

  return strictEqual(0)(path.length) ? member.moduleSpecifier : `${member.moduleSpecifier}:${path}`
}
