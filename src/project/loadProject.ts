import * as path from "node:path"
import { Effect, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { TsProgram } from "../rules/tsSchema.js"

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

class MissingTsconfigError extends Schema.TaggedError<MissingTsconfigError>(
  "MissingTsconfigError"
)("MissingTsconfigError", {
  rootPath: Schema.String
}) {
  get message(): string {
    return `Could not find tsconfig.json from ${this.rootPath}`
  }
}

class InvalidTsconfigError extends Schema.TaggedError<InvalidTsconfigError>(
  "InvalidTsconfigError"
)("InvalidTsconfigError", {
  message: Schema.String
}) {}

class CircularProjectReferenceError extends Schema.TaggedError<CircularProjectReferenceError>(
  "CircularProjectReferenceError"
)("CircularProjectReferenceError", {
  configPath: Schema.String
}) {
  get message(): string {
    return `Circular project reference involving ${this.configPath}`
  }
}

export const loadProject: (
  projectPath: string
) => Effect.Effect<LoadedWorkspace, Error> = Effect.fn("loadProject")(
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
    const projects = yield* loadConfig(configPath.value, rootAncestorPaths)
    const workspaceRootPath = path.dirname(configPath.value)

    return new LoadedWorkspace({ rootPath: workspaceRootPath, projects })
  }
)

const loadConfig: (
  configPath: string,
  ancestorConfigPaths: HashSet.HashSet<string>
) => Effect.Effect<ReadonlyArray<LoadedProject>, Error> = Effect.fn(
  "loadConfig"
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

  return [loadedProjectFromConfig(configPath, parsedConfig)]
})

const loadReference =
  (ancestorConfigPaths: HashSet.HashSet<string>) =>
  (
    reference: ts.ProjectReference
  ): Effect.Effect<ReadonlyArray<LoadedProject>, Error> => {
    const referencedConfigPath = ts.resolveProjectReferencePath(reference)

    return loadConfig(referencedConfigPath, ancestorConfigPaths)
  }

const loadReferencedProjects = Effect.fn("loadReferencedProjects")(function* (
  references: ReadonlyArray<ts.ProjectReference>,
  ancestorConfigPaths: HashSet.HashSet<string>
) {
  const projects = yield* Effect.forEach(
    references,
    loadReference(ancestorConfigPaths)
  )

  return projects.flat()
})

const loadedProjectFromConfig = (
  configPath: string,
  parsedConfig: ts.ParsedCommandLine
): LoadedProject => {
  const rootPath = path.dirname(configPath)
  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences
  })

  return new LoadedProject({ configPath, rootPath, program })
}

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>): string =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: Function.identity,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: Function.constant(ts.sys.newLine)
  })
