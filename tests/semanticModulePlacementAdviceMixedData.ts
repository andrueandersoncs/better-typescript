import { MixedPhysicalModulePlacementData } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementMixedData.js"
import { orderInputModule } from "./semanticModulePlacementAdviceOrderInput.js"
import { parseOrderModule } from "./semanticModulePlacementAdviceParseOrderModule.js"

export const mixedData = MixedPhysicalModulePlacementData.make({
  physicalModulePath: "src/orders/parse.ts",
  modules: [orderInputModule, parseOrderModule]
})
