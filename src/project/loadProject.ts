import * as path from "node:path"
import { Effect, Function, Option, Schema } from "effect"
import * as ts from "typescript"

export interface LoadedProject {
  readonly program: ts.Program
  readonly configPath: string
  readonly rootPath: string
}

export interface LoadedWorkspace {
  readonly rootPath: string
  readonly projects: ReadonlyArray<LoadedProject>
}

class MissingTsconfigError extends Schema.TaggedError<MissingTsconfigError>("MissingTsconfigError")(
  "MissingTsconfigError",
  {
    rootPath: Schema.String
  }
) {
  get message(): string {
    return `Could not find tsconfig.json from ${this.rootPath}`
  }
}

class InvalidTsconfigError extends Schema.TaggedError<InvalidTsconfigError>("InvalidTsconfigError")(
  "InvalidTsconfigError",
  {
    message: Schema.String
  }
) {}

class CircularProjectReferenceError extends Schema.TaggedError<CircularProjectReferenceError>(
  "CircularProjectReferenceError"
)("CircularProjectReferenceError", {
  configPath: Schema.String
}) {
  get message(): string {
    return `Circular project reference involving ${this.configPath}`
  }
}

export const loadProject: (projectPath: string) => Effect.Effect<LoadedWorkspace, Error> =
  Effect.fn("loadProject")(function* (projectPath: string) {
    const rootPath = path.resolve(projectPath)
    const configPath = Option.fromNullable(
      ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")
    )

    if (Option.isNone(configPath)) {
      return yield* Effect.fail(new MissingTsconfigError({ rootPath }))
    }

    const projects = yield* loadConfig(configPath.value, new Set<string>())

    return { rootPath: path.dirname(configPath.value), projects }
  })

const loadConfig: (
  configPath: string,
  ancestorConfigPaths: ReadonlySet<string>
) => Effect.Effect<ReadonlyArray<LoadedProject>, Error> = Effect.fn("loadConfig")(function* (
  configPath: string,
  ancestorConfigPaths: ReadonlySet<string>
) {
  if (ancestorConfigPaths.has(configPath)) {
    return yield* Effect.fail(new CircularProjectReferenceError({ configPath }))
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const configError = Option.fromNullable(configFile.error)

  if (Option.isSome(configError)) {
    return yield* Effect.fail(
      new InvalidTsconfigError({ message: formatDiagnostics([configError.value]) })
    )
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  )

  if (parsedConfig.errors.length > 0) {
    return yield* Effect.fail(
      new InvalidTsconfigError({ message: formatDiagnostics(parsedConfig.errors) })
    )
  }

  const references = parsedConfig.projectReferences ?? []
  const hasNoOwnFiles = parsedConfig.fileNames.length === 0
  const hasReferences = references.length > 0
  const isSolutionStyleConfig = hasNoOwnFiles && hasReferences

  if (isSolutionStyleConfig) {
    return yield* loadReferencedProjects(
      references,
      new Set(ancestorConfigPaths).add(configPath)
    )
  }

  return [loadedProjectFromConfig(configPath, parsedConfig)]
})

const loadReference =
  (ancestorConfigPaths: ReadonlySet<string>) =>
  (reference: ts.ProjectReference): Effect.Effect<ReadonlyArray<LoadedProject>, Error> =>
    loadConfig(ts.resolveProjectReferencePath(reference), ancestorConfigPaths)

const loadReferencedProjects = Effect.fn("loadReferencedProjects")(function* (
  references: ReadonlyArray<ts.ProjectReference>,
  ancestorConfigPaths: ReadonlySet<string>
) {
  const projects = yield* Effect.forEach(references, loadReference(ancestorConfigPaths))

  return projects.flat()
})

const loadedProjectFromConfig = (
  configPath: string,
  parsedConfig: ts.ParsedCommandLine
): LoadedProject => ({
  configPath,
  rootPath: path.dirname(configPath),
  program: ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences
  })
})

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>): string =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: Function.identity,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: Function.constant(ts.sys.newLine)
  })
