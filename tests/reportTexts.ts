import { Effect, pipe } from "effect"
import { WiringConfig } from "@better-typescript/core/engine/wiring/wiringConfig"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import type { LoadedWorkspace } from "@better-typescript/core/project/loadProject"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"

const workspaceUpdateOf = (workspace: LoadedWorkspace): WorkspaceUpdate =>
  new WorkspaceUpdate({
    rootPath: workspace.rootPath,
    contexts: workspace.projects.map((project) => makeContext(project.rootPath)(project.program))
  })

export const reportTexts = (config: WiringConfig) => (workspace: LoadedWorkspace) =>
  pipe(
    reportEvents(config)(workspaceUpdateOf(workspace)),
    Effect.map((events) => events.flatMap((event) => (event._tag === "signal" ? [event.text] : [])))
  )

export { workspaceUpdateOf }
