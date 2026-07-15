import { Order, Struct } from "effect"

interface SignalEvent {
  readonly text: string
}

interface EvidenceItem {
  readonly measure: string
  readonly count: number
}

interface NamedItem {
  readonly name: string
}

type GenericNameGetter = <S extends { readonly name?: unknown }>(
  item: S
) => S["name"] | undefined

const inferredText = Struct.get<SignalEvent, "text">("text")

const genericName: GenericNameGetter = Struct.get("name")

const satisfiedName = Struct.get("name") satisfies (item: NamedItem) => string

export const exportedText: (event: SignalEvent) => string = Struct.get("text")

const byEvidenceCount: Order.Order<EvidenceItem> = Order.mapInput(
  Order.Number,
  Struct.get("count")
)

const event: SignalEvent = { text: "ready" }
const item: EvidenceItem = { measure: "detections", count: 1 }
const values = [
  inferredText(event),
  genericName({ name: "alpha" }),
  satisfiedName({ name: "beta" }),
  exportedText(event),
  byEvidenceCount(item, item)
] as const

void values
