import { Array } from "effect"
import type { ImportedMember } from "./importedMember.js"

export const importedMemberSubject = (member: ImportedMember) =>
  `${member.moduleSpecifier}:${Array.join(member.path, ".")}`
