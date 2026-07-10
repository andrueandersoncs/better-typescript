import { Struct } from "effect"

interface SignalEvent {
  readonly text: string
}

interface EvidenceItem {
  readonly measure: string
  readonly count: number
}

type EvidenceCountGetter = (item: EvidenceItem) => number

const signalText: (event: SignalEvent) => string = Struct.get("text")
const evidenceCount: EvidenceCountGetter = Struct.get("count")

void signalText
void evidenceCount
