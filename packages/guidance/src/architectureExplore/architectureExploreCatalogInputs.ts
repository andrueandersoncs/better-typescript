import { Array } from "effect"
import { architectureExploreNeutralHardBondRuleCatalog } from "./architectureExploreNeutralHardBondRuleCatalog.js"
import { architectureExploreOopHardBondRuleCatalog } from "./architectureExploreOopHardBondRuleCatalog.js"
import { architectureExploreFpHardBondRuleCatalog } from "./architectureExploreFpHardBondRuleCatalog.js"

export const architectureExploreCatalogInputs = Array.make(
  architectureExploreNeutralHardBondRuleCatalog,
  architectureExploreOopHardBondRuleCatalog,
  architectureExploreFpHardBondRuleCatalog
)
