import { Array } from "effect"
import type { SemanticModuleHardBondRuleCatalog } from "./semanticModuleHardBondRuleCatalog.js"

const emptyHardBondRuleCatalogValues: SemanticModuleHardBondRuleCatalog = Array.empty()

export const emptySemanticModuleHardBondRuleCatalog: SemanticModuleHardBondRuleCatalog =
  Object.freeze(emptyHardBondRuleCatalogValues)

export { emptyHardBondRuleCatalogValues }
