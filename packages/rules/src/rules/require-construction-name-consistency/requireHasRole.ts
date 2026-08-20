import { HashSet } from "effect"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import type { SemanticRole } from "../../internal/support/semanticRole.js"

export const hasRole =
  (role: SemanticRole) =>
  (semantics: CallableSemantics): boolean =>
    HashSet.has(semantics.roles, role)
