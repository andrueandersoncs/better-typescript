import type { ImportedMember } from "./importedMember.js"
import { isForbiddenDomainMember } from "./forbiddenDomainMember.js"

export const memberIsForbiddenDomain = (member: ImportedMember) =>
  isForbiddenDomainMember(member.moduleSpecifier, member.path)
