import { Array, Function, Option, pipe } from "effect"

import type { ImportedMember } from "../../support/effectApi/importedMember.js"

export const memberLastName = (member: ImportedMember) =>
  pipe(Array.last(member.path), Option.getOrElse(Function.constant("")))
