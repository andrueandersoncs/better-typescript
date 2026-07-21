import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsProgram } from "@better-typescript/matchers/tsSchema"

// ProjectConfig is leaf config + commandLine because watch starts first.
export class ProjectConfig extends Data.Class<{
  readonly configPath: string
  readonly rootPath: string
  readonly parsed: ts.ParsedCommandLine
}> {}

// WorkspaceConfigs is shared root/projects contract because owners need one term.
export class WorkspaceConfigs extends Data.Class<{
  readonly rootPath: string
  readonly projects: ReadonlyArray<ProjectConfig>
}> {}

// LoadedProject is shared program/paths contract because owners need one term.
export const LoadedProject = Schema.Struct({
  program: TsProgram,
  configPath: Schema.String,
  rootPath: Schema.String
})

export interface LoadedProject extends Schema.Schema.Type<typeof LoadedProject> {}

const loadedProjectsSchema = Schema.Array(LoadedProject)

// LoadedWorkspace is shared root/projects contract because owners need one term.
export const LoadedWorkspace = Schema.Struct({
  rootPath: Schema.String,
  projects: loadedProjectsSchema
})

export interface LoadedWorkspace extends Schema.Schema.Type<typeof LoadedWorkspace> {}

// MissingTsconfigError names syntax protocol because discoverWorkspace agrees.
export class MissingTsconfigError extends Schema.TaggedErrorClass<MissingTsconfigError>()(
  "MissingTsconfigError",
  {
    rootPath: Schema.String
  }
) {
  get message(): string {
    return `Could not find tsconfig.json from ${this.rootPath}`
  }
}

// InvalidTsconfigError names syntax protocol because discoverConfig must agree.
export class InvalidTsconfigError extends Schema.TaggedErrorClass<InvalidTsconfigError>()(
  "InvalidTsconfigError",
  {
    message: Schema.String
  }
) {}

// CircularProjectReferenceError names syntax protocol because discoverConfig agrees.
export class CircularProjectReferenceError extends Schema.TaggedErrorClass<CircularProjectReferenceError>()(
  "CircularProjectReferenceError",
  {
    configPath: Schema.String
  }
) {
  get message(): string {
    return `Circular project reference involving ${this.configPath}`
  }
}
