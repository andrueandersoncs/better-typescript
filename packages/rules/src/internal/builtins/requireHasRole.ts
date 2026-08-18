import { HashSet } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import type { SemanticRole } from "../support/semanticRole.js"

export const hasRole =
  (role: SemanticRole) =>
  (semantics: CallableSemantics): boolean =>
    HashSet.has(semantics.roles, role)
