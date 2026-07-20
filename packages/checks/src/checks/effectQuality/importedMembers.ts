import { Array, Function, Option, pipe } from "effect"
import type { ImportedMember } from "../functionalCoreEffect/support.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

export const memberLastName = (member: ImportedMember) =>
  pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))

export const memberSubject = (member: ImportedMember) => {
  const path = Array.join(member.path, ".")

  return strictEqual(path.length, 0) ? member.moduleSpecifier : `${member.moduleSpecifier}:${path}`
}
