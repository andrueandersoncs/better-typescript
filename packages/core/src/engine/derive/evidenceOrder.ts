import { Order, Struct } from "effect"
import type { EvidenceItem } from "./evidenceItem.js"
import { byMeasure } from "./byMeasure.js"

const descendingNumber = Order.flip(Order.Number)

const byCountDescending: Order.Order<EvidenceItem> = Order.mapInput(
  descendingNumber,
  Struct.get("count")
)

export const evidenceOrder = Order.combine(byCountDescending, byMeasure)
