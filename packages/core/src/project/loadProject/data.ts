import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsProgram } from "../../engine/tsSchema.js"

/**
 * A discovered leaf project: its config location and parsed command line, with
 * no ts.Program built yet. Watch mode consumes configs directly.
 *
 * @remarks
 *   Program construction is deferred because watch mode starts from configs and
 *   builds programs through the TypeScript watcher instead. This model remains
 *   explicit because its consumers need the documented contract; removing it
 *   would reintroduce that contract at each use site.
 * @modelRole shared
 */
export class ProjectConfig extends Data.Class<{
  readonly configPath: string
  readonly rootPath: string
  readonly parsed: ts.ParsedCommandLine
}> {}

/**
 * WorkspaceConfigs is the shared rootPath, projects contract used by
 * discoverWorkspace, workspaceUpdates, and workspaceSignalsFromConfigs.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class WorkspaceConfigs extends Data.Class<{
  readonly rootPath: string
  readonly projects: ReadonlyArray<ProjectConfig>
}> {}

/**
 * LoadedProject is the shared program, configPath, rootPath contract used by
 * loadedProjectsSchema, loadProjectConfig, and contextFromLoadedProject.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class LoadedProject extends Schema.Class<LoadedProject>("LoadedProject")({
  program: TsProgram,
  configPath: Schema.String,
  rootPath: Schema.String
}) {}

const loadedProjectsSchema = Schema.Array(LoadedProject)

/**
 * LoadedWorkspace is the public loadProject return and runtime-schema seam.
 *
 * @remarks
 *   It remains explicit because that public contract must evolve independently
 *   from project-loading internals. Removing it would couple callers and
 *   runtime validation to internal representations.
 * @modelRole boundary
 */
export class LoadedWorkspace extends Schema.Class<LoadedWorkspace>("LoadedWorkspace")({
  rootPath: Schema.String,
  projects: loadedProjectsSchema
}) {}

/**
 * MissingTsconfigError names the compiler syntax protocol handled by
 * discoverWorkspace.
 *
 * @remarks
 *   It remains explicit because those algorithms must agree on the accepted
 *   syntax vocabulary. Removing it would repeat the compiler-node union in each
 *   matcher and let their accepted cases drift.
 * @modelRole protocol
 */
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

/**
 * InvalidTsconfigError names the compiler syntax protocol handled by
 * discoverConfig.
 *
 * @remarks
 *   It remains explicit because those algorithms must agree on the accepted
 *   syntax vocabulary. Removing it would repeat the compiler-node union in each
 *   matcher and let their accepted cases drift.
 * @modelRole protocol
 */
export class InvalidTsconfigError extends Schema.TaggedErrorClass<InvalidTsconfigError>()(
  "InvalidTsconfigError",
  {
    message: Schema.String
  }
) {}

/**
 * CircularProjectReferenceError names the compiler syntax protocol handled by
 * discoverConfig.
 *
 * @remarks
 *   It remains explicit because those algorithms must agree on the accepted
 *   syntax vocabulary. Removing it would repeat the compiler-node union in each
 *   matcher and let their accepted cases drift.
 * @modelRole protocol
 */
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
