import * as path from "node:path"
import { Array, Effect, Function, HashSet, Option } from "effect"
import * as ts from "typescript"
import {
  CircularProjectReferenceError,
  InvalidTsconfigError,
  LoadedProject,
  LoadedWorkspace,
  MissingTsconfigError,
  ProjectConfig,
  WorkspaceConfigs
} from "./data.js"

export const discoverWorkspace: (
  projectPath: string
) => Effect.Effect<WorkspaceConfigs, Error> = Effect.fn("discoverWorkspace")(
  function* (projectPath: string) {
    const rootPath = path.resolve(projectPath)
    const foundConfigPath = ts.findConfigFile(
      rootPath,
      ts.sys.fileExists,
      "tsconfig.json"
    )
    const configPath = Option.fromNullable(foundConfigPath)

    if (Option.isNone(configPath)) {
      return yield* new MissingTsconfigError({ rootPath })
    }

    const rootAncestorPaths = HashSet.empty<string>()
    const projects = yield* discoverConfig(configPath.value, rootAncestorPaths)
    const workspaceRootPath = path.dirname(configPath.value)

    return new WorkspaceConfigs({ rootPath: workspaceRootPath, projects })
  }
)

const createProject = (config: ProjectConfig): LoadedProject => {
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

export const loadProject: (
  projectPath: string
) => Effect.Effect<LoadedWorkspace, Error> = Effect.fn("loadProject")(
  function* (projectPath: string) {
    const workspace = yield* discoverWorkspace(projectPath)
    const projects = Array.map(workspace.projects, createProject)

    return new LoadedWorkspace({ rootPath: workspace.rootPath, projects })
  }
)

const discoverConfig: (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) => Effect.Effect<ReadonlyArray<ProjectConfig>, Error> = Effect.fn(
  "discoverConfig"
)(function* (configPath: string, ancestorConfigPaths: HashSet.HashSet<string>) {
  if (HashSet.has(ancestorConfigPaths, configPath)) {
    return yield* new CircularProjectReferenceError({ configPath })
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const configError = Option.fromNullable(configFile.error)

  if (Option.isSome(configError)) {
    const message = formatDiagnostics([configError.value])

    return yield* new InvalidTsconfigError({ message })
  }

  const configDirectory = path.dirname(configPath)
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDirectory
  )

  if (parsedConfig.errors.length > 0) {
    const message = formatDiagnostics(parsedConfig.errors)

    return yield* new InvalidTsconfigError({ message })
  }

  const references = parsedConfig.projectReferences ?? []
  const hasNoOwnFiles = parsedConfig.fileNames.length === 0
  const hasReferences = references.length > 0
  const isSolutionStyleConfig = hasNoOwnFiles && hasReferences

  if (isSolutionStyleConfig) {
    const nextAncestorPaths = HashSet.add(ancestorConfigPaths, configPath)

    return yield* loadReferencedProjects(references, nextAncestorPaths)
  }

  const rootPath = path.dirname(configPath)

  return [new ProjectConfig({ configPath, rootPath, parsed: parsedConfig })]
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
