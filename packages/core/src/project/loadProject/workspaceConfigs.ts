import { Data } from "effect"
import { ProjectConfig } from "./projectConfig.js"

// WorkspaceConfigs is shared root/projects contract because owners need one term.
export class WorkspaceConfigs extends Data.Class<{
  readonly rootPath: string
  readonly projects: ReadonlyArray<ProjectConfig>
}> {}
