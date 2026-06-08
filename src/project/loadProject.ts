import * as path from "node:path"
import * as ts from "typescript"

export interface LoadedProject {
  readonly program: ts.Program
  readonly configPath: string
  readonly rootPath: string
}

export function loadProject(projectPath: string): LoadedProject {
  const rootPath = path.resolve(projectPath)
  const configPath = ts.findConfigFile(rootPath, ts.sys.fileExists, "tsconfig.json")

  if (configPath === undefined) {
    throw new Error(`Could not find tsconfig.json from ${rootPath}`)
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)

  if (configFile.error !== undefined) {
    throw new Error(formatDiagnostics([configFile.error]))
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  )

  if (parsedConfig.errors.length > 0) {
    throw new Error(formatDiagnostics(parsedConfig.errors))
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
}

function formatDiagnostics(diagnostics: ReadonlyArray<ts.Diagnostic>): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
  })
}
