import { semanticRole } from "../../internal/support/semanticRole2.js"
import { hasRole } from "./requireHasRole.js"

export const constructionRole = semanticRole("construction")
export const hasConstructionRole = hasRole(constructionRole)
