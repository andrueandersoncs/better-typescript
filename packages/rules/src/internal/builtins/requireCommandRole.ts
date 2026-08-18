import { HashSet } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { semanticRole } from "../support/semanticRole2.js"

const commandRole = semanticRole("command")

export const hasCommandRole = (semantics: CallableSemantics) =>
  HashSet.has(semantics.roles, commandRole)
