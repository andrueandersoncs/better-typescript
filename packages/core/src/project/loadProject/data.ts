import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsProgram } from "../../engine/tsSchema.js"

/**
 * A discovered leaf project: its config location and parsed command line, with
 * no ts.Program built yet. Watch mode consumes configs directly.
 */
export class ProjectConfig extends Data.Class<{
  readonly configPath: string
  readonly rootPath: string
  readonly parsed: ts.ParsedCommandLine
}> {}

export class WorkspaceConfigs extends Data.Class<{
  readonly rootPath: string
  readonly projects: ReadonlyArray<ProjectConfig>
}> {}

export class LoadedProject extends Schema.Class<LoadedProject>("LoadedProject")(
  {
    program: TsProgram,
    configPath: Schema.String,
    rootPath: Schema.String
  }
) {}

const loadedProjectsSchema = Schema.Array(LoadedProject)

export class LoadedWorkspace extends Schema.Class<LoadedWorkspace>(
  "LoadedWorkspace"
)({
  rootPath: Schema.String,
  projects: loadedProjectsSchema
}) {}

export class MissingTsconfigError extends Schema.TaggedError<MissingTsconfigError>(
  "MissingTsconfigError"
)("MissingTsconfigError", {
  rootPath: Schema.String
}) {
  get message(): string {
    return `Could not find tsconfig.json from ${this.rootPath}`
  }
}

export class InvalidTsconfigError extends Schema.TaggedError<InvalidTsconfigError>(
  "InvalidTsconfigError"
)("InvalidTsconfigError", {
  message: Schema.String
}) {}

export class CircularProjectReferenceError extends Schema.TaggedError<CircularProjectReferenceError>(
  "CircularProjectReferenceError"
)("CircularProjectReferenceError", {
  configPath: Schema.String
}) {
  get message(): string {
    return `Circular project reference involving ${this.configPath}`
  }
}
