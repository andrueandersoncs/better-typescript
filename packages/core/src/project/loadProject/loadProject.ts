import * as path from "node:path"
import { Array, Effect, Equal, Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import type { Check } from "../../engine/check/data.js"
import type { Detection } from "../../engine/location/data.js"
import { makeContext } from "../../engine/sources/sources.js"
import { compilerOptionsForChecks, runChecks } from "../../engine/check/check.js"
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
> = Effect.fn("LoadProject.discoverWorkspace")(function* (projectPath: string) {
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

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)
const includeEverySourceFile = Function.constant(true)

// The one-Check runner owns compiler requirements because callers should not know Check internals.
const programForChecks =
  (checks: ReadonlyArray<Check>) =>
  (program: ts.Program): ts.Program => {
    const compilerOptions = compilerOptionsForChecks(checks)
    const currentOptions = program.getCompilerOptions()

    const optionMatches = ([name, value]: [string, unknown]) => {
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

export const runCheckOnProject =
  (checks: ReadonlyArray<Check>) =>
  (project: LoadedProject): Effect.Effect<ReadonlyArray<Detection>> =>
    Effect.sync(() => {
      const program = programForChecks(checks)(project.program)
      const createContext = makeContext(project.rootPath)
      const context = createContext(program)
      const checksInEveryFile = runChecks(checks)(includeEverySourceFile)
      const detections = checksInEveryFile(context)

      return pipe(detections, Array.head, Option.getOrElse(noDetections))
    })

export const loadProject = Effect.fn("LoadProject.load")(function* (
  projectPath: string,
  compilerOptions: ts.CompilerOptions = {}
) {
  const workspace = yield* discoverWorkspace(projectPath)

  const projects = Array.map(workspace.projects, (config) =>
    loadProjectConfig(config, compilerOptions)
  )

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
