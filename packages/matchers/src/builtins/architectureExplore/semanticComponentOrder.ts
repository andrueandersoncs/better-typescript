import { Array, Option, Order, pipe } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import { entityKeyOrder } from "./entityKeyOrder.js"

const componentHead = (component: ReadonlyArray<SemanticModuleEntityKey>) =>
  pipe(component, Array.head, Option.getOrThrow)

export const semanticComponentOrder = Order.mapInput(entityKeyOrder, componentHead)
