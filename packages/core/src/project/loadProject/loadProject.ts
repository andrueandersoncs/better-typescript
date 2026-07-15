import * as path from "node:path"
import { Array, Effect, Function, HashSet, Option, Stream, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "../../engine/check/data.js"
import type { Detection } from "../../engine/location/data.js"
import {
  batchReportBlocks,
  initialReportEvents,
  workspaceSignals,
  workspaceSignalsForProjects
} from "../../engine/report/report.js"
import type { ReportBlock, WiringConfig, WiringSignals } from "../../engine/report/data.js"
import type { ReportEvent } from "../../engine/watch/data.js"
import {
  astNodesFromContext,
  contextFor,
  isProjectSourceFile,
  runChecks
} from "../../engine/sources/sources.js"
import type { AstNodeElement, ProgramContext } from "../../engine/sources/data.js"
import {
  CircularProjectReferenceError,
  InvalidTsconfigError,
  LoadedProject,
  LoadedWorkspace,
  MissingTsconfigError,
  ProjectConfig,
  WorkspaceConfigs
} from "./data.js"

export const discoverWorkspace: (projectPath: string) => Effect.Effect<WorkspaceConfigs, Error> =
  Effect.fn("discoverWorkspace")(function* (projectPath: string) {
    const rootPath = path.resolve(projectPath)

    const foundConfigPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")

    const configPath = Option.fromNullable(foundConfigPath)

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

export const loadProjectConfig = (config: ProjectConfig): LoadedProject => {
  const program = ts.createProgram({
    rootNames: config.parsed.fileNames,
    options: config.parsed.options,
    projectReferences: config.parsed.projectReferences
  })

  return new LoadedProject({
    configPath: config.configPath,
    rootPath: config.rootPath,
    program
  })
}

export const checkableSourceFiles = (project: LoadedProject): Stream.Stream<ts.SourceFile, Error> =>
  pipe(project.program.getSourceFiles(), Array.filter(isProjectSourceFile), Stream.fromIterable)

export const contextFromLoadedProject = (project: LoadedProject): ProgramContext => {
  const createContext = contextFor(project.rootPath)

  return createContext(project.program)
}

export const astNodes = (project: LoadedProject): Stream.Stream<AstNodeElement, Error> =>
  pipe(project.program, contextFor(project.rootPath), astNodesFromContext)

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)
const includeEverySourceFile = Function.constant(true)

const contextFromProjectConfig: (config: ProjectConfig) => ProgramContext = flow(
  loadProjectConfig,
  contextFromLoadedProject
)

export const workspaceSignalsFromConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Effect.Effect<ReadonlyArray<WiringSignals>, Error> =>
    workspaceSignalsForProjects(config)(workspace.rootPath)(workspace.projects)(
      contextFromProjectConfig
    )

export const runCheckOnProject =
  (checks: ReadonlyArray<Check>) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>, Error> =>
    Effect.sync(() => {
      const context = contextFromLoadedProject(project)
      const checksInEveryFile = runChecks(checks)(includeEverySourceFile)
      const detections = checksInEveryFile(context)

      return pipe(detections, Array.head, Option.getOrElse(noDetections))
    })

export const reportBlocksFromConfig =
  (config: WiringConfig) =>
  (workspace: LoadedWorkspace): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(
      workspace.projects,
      Array.map(contextFromLoadedProject),
      workspaceSignals(config)(workspace.rootPath),
      Effect.flatMap(batchReportBlocks(config))
    )

export const reportBlocksFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Effect.Effect<ReadonlyArray<ReportBlock>, Error> =>
    pipe(workspaceSignalsFromConfigs(config)(workspace), Effect.flatMap(batchReportBlocks(config)))

export const reportFromConfig =
  (config: WiringConfig) =>
  (workspace: LoadedWorkspace): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromConfig(config)(workspace),
      Stream.fromIterableEffect,
      Stream.map(Struct.get("text"))
    )

export const reportFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Stream.Stream<string, Error> =>
    pipe(
      reportBlocksFromWorkspaceConfigs(config)(workspace),
      Stream.fromIterableEffect,
      Stream.map(Struct.get("text"))
    )

export const reportEventsFromConfig =
  (config: WiringConfig) =>
  (workspace: LoadedWorkspace): Stream.Stream<ReportEvent, Error> =>
    pipe(
      reportBlocksFromConfig(config)(workspace),
      Effect.map(initialReportEvents(workspace.rootPath)),
      Stream.fromIterableEffect
    )

export const reportEventsFromWorkspaceConfigs =
  (config: WiringConfig) =>
  (workspace: WorkspaceConfigs): Stream.Stream<ReportEvent, Error> =>
    pipe(
      reportBlocksFromWorkspaceConfigs(config)(workspace),
      Effect.map(initialReportEvents(workspace.rootPath)),
      Stream.fromIterableEffect
    )

export const loadProject: (projectPath: string) => Effect.Effect<LoadedWorkspace, Error> =
  Effect.fn("loadProject")(function* (projectPath: string) {
    const workspace = yield* discoverWorkspace(projectPath)
    const projects = Array.map(workspace.projects, loadProjectConfig)

    return new LoadedWorkspace({ rootPath: workspace.rootPath, projects })
  })

const discoverConfig: (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) => Effect.Effect<ReadonlyArray<ProjectConfig>, Error> = Effect.fn("discoverConfig")(function* (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) {
  if (HashSet.has(ancestorConfigPaths, configPath)) {
    return yield* new CircularProjectReferenceError({ configPath })
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const configError = Option.fromNullable(configFile.error)

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
