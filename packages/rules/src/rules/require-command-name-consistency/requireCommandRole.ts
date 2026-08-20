import { HashSet } from "effect"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import { semanticRole } from "../../internal/support/semanticRole2.js"

const commandRole = semanticRole("command")

export const hasCommandRole = (semantics: CallableSemantics) =>
  HashSet.has(semantics.roles, commandRole)
