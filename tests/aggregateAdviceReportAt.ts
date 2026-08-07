import { Effect } from "effect"
import { type SignalEvent } from "@better-typescript/core/engine/report/signalEvent"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { defineConfig } from "@better-typescript/core/project/loadWiringConfig"
import { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import { loadProject } from "@better-typescript/core/project/loadProject"

export const reportAt = async (
  wiring: Wiring,
  projectRoot: string
): Promise<ReadonlyArray<SignalEvent>> => {
  const workspace = await Effect.runPromise(loadProject(projectRoot))
  const config = defineConfig([{ files: ["**/*"], wiring }])
  const update = new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })
  const events = await Effect.runPromise(reportEvents(config)(update))

  return events.filter((event): event is SignalEvent => event._tag === "signal")
}
