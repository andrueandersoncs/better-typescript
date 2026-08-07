import { formatOrderError } from "./semanticModulePlacementAdviceFormatOrderError.js"
import { orderParseError } from "./semanticModulePlacementAdviceOrderParseError.js"
import { parseOrder } from "./semanticModulePlacementAdviceParseOrder.js"
import { slice } from "./semanticModulePlacementAdviceSlice.js"

export const parseOrderModule = slice(
  [parseOrder, formatOrderError, orderParseError],
  ["src/orders/errors.ts", "src/orders/parse.ts"]
)
