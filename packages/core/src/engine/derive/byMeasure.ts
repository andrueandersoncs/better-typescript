import { Order, Struct } from "effect"
import type { EvidenceItem } from "./evidenceItem.js"

export const byMeasure: Order.Order<EvidenceItem> = Order.mapInput(
  Order.String,
  Struct.get("measure")
)
