import { type ReportEvent } from "@better-typescript/core/engine/report/reportEvent"

type SignalReportEvent = Extract<ReportEvent, { readonly _tag: "signal" }>

export const blocksWithTitle = (
  blocks: ReadonlyArray<SignalReportEvent>,
  title: string
): ReadonlyArray<SignalReportEvent> =>
  blocks.filter((block) => block.key._tag === "advice" && block.key.title === title)
