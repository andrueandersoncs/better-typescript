import { SplitSemanticModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementSplitData.js"
import { parseOrderModule } from "./semanticModulePlacementAdviceParseOrderModule.js"

export const splitData = SplitSemanticModulePlacementData.make({
  modules: [parseOrderModule]
})
