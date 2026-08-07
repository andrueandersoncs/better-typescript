import { type SignalEvent } from "@better-typescript/core/engine/report/signalEvent"

export const blocksWithTitle = (
  blocks: ReadonlyArray<SignalEvent>,
  title: string
): ReadonlyArray<SignalEvent> =>
  blocks.filter((block) => block.key._tag === "advice" && block.key.title === title)
