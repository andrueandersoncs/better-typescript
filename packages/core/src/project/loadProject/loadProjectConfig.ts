import * as path from "node:path"
import * as ts from "typescript"
import { LoadedProject } from "./loadedProject.js"
import type { ProjectConfig } from "./projectConfig.js"

const analysisCompilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

export const loadProjectConfig =
  (compilerOptions: ts.CompilerOptions) => (config: ProjectConfig) => {
    const options = Object.assign(
      {},
      config.parsed.options,
      analysisCompilerOptions,
      compilerOptions
    )

    const host = ts.createCompilerHost(options)

    host.jsDocParsingMode = ts.JSDocParsingMode.ParseForTypeErrors

    const program = ts.createProgram({
      rootNames: config.parsed.fileNames,
      projectReferences: config.parsed.projectReferences,
      options,
      host
    })

    const rootPath = path.dirname(config.configPath)

    return LoadedProject.make({
      configPath: config.configPath,
      rootPath,
      program
    })
  }
