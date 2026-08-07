import { Array, Order, Struct } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"

const keyPathOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.String,
  Struct.get("path")
)

const keyStartOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("start")
)

const keyEndOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("end")
)

const keyKindOrder: Order.Order<SemanticModuleEntityKey> = Order.mapInput(
  Order.Number,
  Struct.get("syntaxKind")
)

const keyOrders = Array.make(keyPathOrder, keyStartOrder, keyEndOrder, keyKindOrder)
export const entityKeyOrder = Order.combineAll(keyOrders)

export { keyPathOrder, keyStartOrder, keyEndOrder, keyKindOrder, keyOrders }
