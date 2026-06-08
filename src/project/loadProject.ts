import * as path from "node:path"
import { Effect, Schema } from "effect"
import * as ts from "typescript"

export interface LoadedProject {
  readonly program: ts.Program
  readonly configPath: string
  readonly rootPath: string
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

export const loadProject = (projectPath: string): Effect.Effect<LoadedProject, Error> => {
  return Effect.gen(function* () {
    const rootPath = path.resolve(projectPath)
    const configPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")

    if (configPath === undefined) {
      return yield* Effect.fail(new MissingTsconfigError({ rootPath }))
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

    if (configFile.error !== undefined) {
      return yield* Effect.fail(
        new InvalidTsconfigError({ message: formatDiagnostics([configFile.error]) })
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

    return {
      configPath,
      rootPath: path.dirname(configPath),
      program: ts.createProgram({
        rootNames: parsedConfig.fileNames,
        options: parsedConfig.options,
        projectReferences: parsedConfig.projectReferences
      })
    }
  })
}

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>): string => {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
  })
}
