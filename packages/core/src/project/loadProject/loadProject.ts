import * as path from "node:path"
import { Array, Effect, Equal, Function, HashSet, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "../../engine/check/data.js"
import type { Detection } from "../../engine/location/data.js"
import type { WiringSignals } from "../../engine/signal/data.js"
import type { WiringConfig } from "../../engine/wiring/data.js"
import {
  compilerOptionsForConfig,
  workspaceSignalsForProjects
} from "../../engine/wiring/wiring.js"
import { contextFor } from "../../engine/sources/sources.js"
import { compilerOptionsForChecks, runChecks } from "../../engine/check/check.js"
import type { ProgramContext } from "../../engine/sources/data.js"
import {
  CircularProjectReferenceError,
  InvalidTsconfigError,
  LoadedProject,
  LoadedWorkspace,
  MissingTsconfigError,
  ProjectConfig,
  WorkspaceConfigs
} from "./data.js"
import { createAnalysisProgram } from "./analysisCompilerOptions.js"

export const discoverWorkspace: (
  projectPath: string
) => Effect.Effect<
  WorkspaceConfigs,
  MissingTsconfigError | CircularProjectReferenceError | InvalidTsconfigError
> = Effect.fn("discoverWorkspace")(function* (projectPath: string) {
  const rootPath = path.resolve(projectPath)
  const foundConfigPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")
  const configPath = Option.fromNullishOr(foundConfigPath)

  if (Option.isNone(configPath)) {
    return yield* new MissingTsconfigError({ rootPath })
  }

  const rootAncestorPaths = HashSet.empty<string>()
  const discoveredProjects = yield* discoverConfig(configPath.value, rootAncestorPaths)

  const projects = Array.dedupeWith(
    discoveredProjects,
    (self, that) => self.configPath === that.configPath
  )

  const workspaceRootPath = path.dirname(configPath.value)

  return new WorkspaceConfigs({ rootPath: workspaceRootPath, projects })
})

const loadProjectConfig = (
  config: ProjectConfig,
  compilerOptions: ts.CompilerOptions = {}
): LoadedProject => {
  const program = createAnalysisProgram(
    {
      rootNames: config.parsed.fileNames,
      options: config.parsed.options,
      projectReferences: config.parsed.projectReferences
    },
    compilerOptions
  )

  return new LoadedProject({
    configPath: config.configPath,
    rootPath: config.rootPath,
    program
  })
}

const contextFromLoadedProject = (project: LoadedProject): ProgramContext => {
  const createContext = contextFor(project.rootPath)

  return createContext(project.program)
}

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)
const includeEverySourceFile = Function.constant(true)

const contextFromProjectConfig = (compilerOptions: ts.CompilerOptions) =>
  flow(
    (config: ProjectConfig) => loadProjectConfig(config, compilerOptions),
    contextFromLoadedProject
  )

// The one-Check runner owns compiler requirements because callers should not know Check internals.
const programForChecks =
  (checks: ReadonlyArray<Check>) =>
  (program: ts.Program): ts.Program => {
    const compilerOptions = compilerOptionsForChecks(checks)
    const currentOptions = program.getCompilerOptions()

    const optionMatches = ([name, value]: [string, unknown]): boolean => {
      const currentValue = Reflect.get(currentOptions, name)

      return Equal.equals(currentValue, value)
    }

    const compilerOptionEntries = Object.entries(compilerOptions)
    const alreadyConfigured = pipe(compilerOptionEntries, Array.every(optionMatches))

    if (alreadyConfigured) {
      return program
    }

    const rootNames = program.getRootFileNames()
    const projectReferences = program.getProjectReferences()

    return createAnalysisProgram(
      {
        rootNames,
        options: currentOptions,
        projectReferences
      },
      compilerOptions
    )
  }

// One projection stays public because config callers load and analyze in one step.
export const workspaceSignalsFromConfigs =
  <E>(config: WiringConfig<E>) =>
  (workspace: WorkspaceConfigs): Effect.Effect<ReadonlyArray<WiringSignals>> => {
    const compilerOptions = compilerOptionsForConfig(config)

    const collectProjects = workspaceSignalsForProjects(config)(workspace.rootPath)(
      workspace.projects
    )

    return collectProjects(contextFromProjectConfig(compilerOptions))
  }

export const runCheckOnProject =
  (checks: ReadonlyArray<Check>) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>> =>
    Effect.sync(() => {
      const program = programForChecks(checks)(project.program)
      const createContext = contextFor(project.rootPath)
      const context = createContext(program)
      const checksInEveryFile = runChecks(checks)(includeEverySourceFile)
      const detections = checksInEveryFile(context)

      return pipe(detections, Array.head, Option.getOrElse(noDetections))
    })

export const loadProject = Effect.fn("loadProject")(function* (
  projectPath: string,
  compilerOptions: ts.CompilerOptions = {}
) {
  const workspace = yield* discoverWorkspace(projectPath)

  const projects = Array.map(workspace.projects, (config) =>
    loadProjectConfig(config, compilerOptions)
  )

  return new LoadedWorkspace({ rootPath: workspace.rootPath, projects })
})

const discoverConfig: (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) => Effect.Effect<
  ReadonlyArray<ProjectConfig>,
  CircularProjectReferenceError | InvalidTsconfigError
> = Effect.fn("discoverConfig")(function* (
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
  const hasNoOwnFiles = parsedConfig.fileNames.length === 0
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

const loadReferencedProjects = Effect.fn("loadReferencedProjects")(function* (
  references: ReadonlyArray<ts.ProjectReference>,
  ancestorConfigPaths: HashSet.HashSet<string>
) {
  const projects = yield* Effect.forEach(references, (reference) => {
    const referencedConfigPath = ts.resolveProjectReferencePath(reference)

    return discoverConfig(referencedConfigPath, ancestorConfigPaths)
  })

  return Array.flatten(projects)
})

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>): string =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: Function.identity,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: Function.constant(ts.sys.newLine)
  })
