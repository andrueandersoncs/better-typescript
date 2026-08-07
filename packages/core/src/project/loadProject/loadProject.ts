import * as path from "node:path"
import { Array, Effect, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../engine/equivalence/strictEqual.js"
import { CircularProjectReferenceError } from "./circularProjectReferenceError.js"
import { InvalidTsconfigError } from "./invalidTsconfigError.js"
import { LoadedProject } from "./loadedProject.js"
import { ProjectConfig } from "./projectConfig.js"
import { WorkspaceConfigs } from "./workspaceConfigs.js"
import { createAnalysisProgram } from "./createAnalysisProgram.js"

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

export const discoverWorkspace: (
  projectPath: string
) => Effect.Effect<
  WorkspaceConfigs,
  MissingTsconfigError | CircularProjectReferenceError | InvalidTsconfigError
> = Effect.fn("LoadProject.discoverWorkspace")(function* (projectPath: string) {
  const rootPath = path.resolve(projectPath)
  const foundConfigPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")
  const configPath = Option.fromNullishOr(foundConfigPath)

  if (Option.isNone(configPath)) {
    return yield* new MissingTsconfigError({ rootPath })
  }

  const rootAncestorPaths = HashSet.empty<string>()
  const discoveredProjects = yield* discoverConfig(configPath.value, rootAncestorPaths)

  const projects = Array.dedupeWith(discoveredProjects, (self, that) =>
    strictEqual(that.configPath)(self.configPath)
  )

  const workspaceRootPath = path.dirname(configPath.value)

  return new WorkspaceConfigs({ rootPath: workspaceRootPath, projects })
})

const loadProjectConfig = (config: ProjectConfig, compilerOptions: ts.CompilerOptions = {}) => {
  const program = createAnalysisProgram(
    {
      rootNames: config.parsed.fileNames,
      options: config.parsed.options,
      projectReferences: config.parsed.projectReferences
    },
    compilerOptions
  )

  return LoadedProject.make({
    configPath: config.configPath,
    rootPath: config.rootPath,
    program
  })
}

export const loadProject = Effect.fn("LoadProject.load")(function* (
  projectPath: string,
  compilerOptions: ts.CompilerOptions = {}
) {
  const workspace = yield* discoverWorkspace(projectPath)
  const loadConfig = (config: ProjectConfig) => loadProjectConfig(config, compilerOptions)
  const projects = Array.map(workspace.projects, loadConfig)

  return LoadedWorkspace.make({ rootPath: workspace.rootPath, projects })
})

const discoverConfig: (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) => Effect.Effect<
  ReadonlyArray<ProjectConfig>,
  CircularProjectReferenceError | InvalidTsconfigError
> = Effect.fn("LoadProject.discoverConfig")(function* (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) {
  if (HashSet.has(ancestorConfigPaths, configPath)) {
    return yield* new CircularProjectReferenceError({ configPath })
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const configError = Option.fromNullishOr(configFile.error)

  if (Option.isSome(configError)) {
    const diagnostics2 = Array.of(configError.value)
    const message = formatDiagnostics(diagnostics2)

    return yield* new InvalidTsconfigError({ message })
  }

  const configDirectory = path.dirname(configPath)
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDirectory)

  if (parsedConfig.errors.length > 0) {
    const message = formatDiagnostics(parsedConfig.errors)

    return yield* new InvalidTsconfigError({ message })
  }

  const references = parsedConfig.projectReferences ?? Array.empty()
  const hasNoOwnFiles = strictEqual(0)(parsedConfig.fileNames.length)
  const hasReferences = references.length > 0
  const isSolutionStyleConfig = hasNoOwnFiles && hasReferences

  if (isSolutionStyleConfig) {
    const nextAncestorPaths = HashSet.add(ancestorConfigPaths, configPath)

    return yield* loadReferencedProjects(references, nextAncestorPaths)
  }

  const rootPath = path.dirname(configPath)

  const projectConfig = new ProjectConfig({
    configPath,
    rootPath,
    parsed: parsedConfig
  })

  return Array.of(projectConfig)
})

const loadReferencedProjects = Effect.fn("LoadProject.loadReferencedProjects")(function* (
  references: ReadonlyArray<ts.ProjectReference>,
  ancestorConfigPaths: HashSet.HashSet<string>
) {
  const projects = yield* Effect.forEach(references, (reference) => {
    const referencedConfigPath = ts.resolveProjectReferencePath(reference)

    return discoverConfig(referencedConfigPath, ancestorConfigPaths)
  })

  return Array.flatten(projects)
})

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>) =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: Function.identity,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: Function.constant(ts.sys.newLine)
  })
