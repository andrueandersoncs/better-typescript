import { Effect } from "effect"

import { type ReportEvent } from "@better-typescript/core/engine/report/reportEvent"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import { loadProject } from "@better-typescript/core/project/loadProject"

type SignalReportEvent = Extract<ReportEvent, { readonly _tag: "signal" }>

export const reportAt = async (
  wiring: Wiring,
  projectRoot: string
): Promise<ReadonlyArray<SignalReportEvent>> => {
  const workspace = await Effect.runPromise(loadProject(projectRoot))
  const config = defineConfig([{ files: ["**/*"], wiring }])
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })
  const events = await Effect.runPromise(reportEvents(config)(update))

  return events.filter((event): event is SignalReportEvent => event._tag === "signal")
}
