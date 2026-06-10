import * as path from "node:path"
import { Effect, Option, Schema } from "effect"
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

export const loadProject = (projectPath: string): Effect.Effect<LoadedWorkspace, Error> =>
  Effect.gen(function* () {
    const rootPath = path.resolve(projectPath)
    const configPath = yield* Option.match(
      Option.fromNullable(ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")),
      {
        onNone: () => Effect.fail(new MissingTsconfigError({ rootPath })),
        onSome: (configPath) => Effect.succeed(configPath)
      }
    )

    const projects = yield* loadConfig(configPath, new Set<string>())

    return { rootPath: path.dirname(configPath), projects }
  })

const loadConfig = (
  configPath: string,
  ancestorConfigPaths: ReadonlySet<string>
): Effect.Effect<ReadonlyArray<LoadedProject>, Error> =>
  Effect.gen(function* () {
    if (ancestorConfigPaths.has(configPath)) {
      return yield* Effect.fail(new CircularProjectReferenceError({ configPath }))
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

    yield* Option.match(Option.fromNullable(configFile.error), {
      onNone: () => Effect.succeed(void 0),
      onSome: (error) =>
        Effect.fail(new InvalidTsconfigError({ message: formatDiagnostics([error]) }))
    })

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

const loadReferencedProjects = (
  references: ReadonlyArray<ts.ProjectReference>,
  ancestorConfigPaths: ReadonlySet<string>
): Effect.Effect<ReadonlyArray<LoadedProject>, Error> =>
  Effect.forEach(references, (reference) =>
    loadConfig(ts.resolveProjectReferencePath(reference), ancestorConfigPaths)
  ).pipe(Effect.map((projects) => projects.flat()))

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
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
  })
