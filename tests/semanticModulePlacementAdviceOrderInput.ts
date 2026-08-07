import { entity } from "./semanticModulePlacementAdviceEntity.js"
import { slice } from "./semanticModulePlacementAdviceSlice.js"

export const orderInput = entity({
  path: "src/orders/parse.ts",
  start: 80,
  end: 120,
  syntaxKind: 262,
  displayName: "OrderInput",
  declarationKind: "TypeAliasDeclaration",
  line: 8,
  column: 1
})

export const orderInputModule = slice([orderInput], ["src/orders/parse.ts"])
