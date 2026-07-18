import { Array, Effect, Function, HashMap, MutableRef, Option, pipe } from "effect"
import * as ts from "typescript"
import { makeContext } from "../sources/sources.js"
import type { ProgramContext } from "../sources/data.js"
import { WorkspaceUpdate } from "./data.js"
import type { ProjectConfig, WorkspaceConfigs } from "../../project/loadProject/data.js"
import {
  analysisJsDocParsingMode,
  withAnalysisCompilerOptions
} from "../../project/loadProject/analysisCompilerOptions.js"

// WorkspaceServices groups retained compiler resources because one finalizer owns their lifetime.
class WorkspaceServices {
  constructor(
    readonly languageServices: ReadonlyArray<ts.LanguageService>,
    readonly contexts: ReadonlyArray<ProgramContext>
  ) {}
}

const snapshotFor =
  (
    snapshots: MutableRef.MutableRef<HashMap.HashMap<string, ts.IScriptSnapshot>>
  ): ts.LanguageServiceHost["getScriptSnapshot"] =>
  (fileName) => {
    const entries = MutableRef.get(snapshots)
    const cached = HashMap.get(entries, fileName)

    if (Option.isSome(cached)) {
      return cached.value
    }

    return pipe(
      ts.sys.readFile(fileName),
      Option.fromNullishOr,
      Option.map((text) => {
        const snapshot = ts.ScriptSnapshot.fromString(text)
        const updated = HashMap.set(entries, fileName, snapshot)

        MutableRef.set(snapshots, updated)

        return snapshot
      }),
      Option.getOrUndefined
    )
  }

const createProjectLanguageService = (
  documentRegistry: ts.DocumentRegistry,
  snapshots: MutableRef.MutableRef<HashMap.HashMap<string, ts.IScriptSnapshot>>,
  config: ProjectConfig,
  compilerOptions: ts.CompilerOptions
) => {
  const options = withAnalysisCompilerOptions(config.parsed.options, compilerOptions)
  const rootNames = config.parsed.fileNames
  const scriptVersion = "0"

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: Function.constant(options),
    getScriptFileNames: Function.constant(rootNames),
    getScriptVersion: Function.constant(scriptVersion),
    getScriptSnapshot: snapshotFor(snapshots),
    getCurrentDirectory: Function.constant(config.rootPath),
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    getNewLine: Function.constant(ts.sys.newLine),
    useCaseSensitiveFileNames: Function.constant(ts.sys.useCaseSensitiveFileNames),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
    getProjectReferences: Function.constant(config.parsed.projectReferences),
    jsDocParsingMode: analysisJsDocParsingMode
  }

  return ts.createLanguageService(host, documentRegistry)
}

const contextFromLanguageService = (config: ProjectConfig, languageService: ts.LanguageService) =>
  pipe(
    languageService.getProgram(),
    Option.fromNullishOr,
    Option.getOrThrow,
    makeContext(config.rootPath)
  )

const createWorkspaceServices = (
  workspace: WorkspaceConfigs,
  compilerOptions: ts.CompilerOptions
) => {
  const documentRegistry = ts.createDocumentRegistry(
    ts.sys.useCaseSensitiveFileNames,
    workspace.rootPath,
    analysisJsDocParsingMode
  )

  const emptySnapshots = HashMap.empty<string, ts.IScriptSnapshot>()
  const snapshots = MutableRef.make(emptySnapshots)

  const languageServices = Array.map(workspace.projects, (config) =>
    createProjectLanguageService(documentRegistry, snapshots, config, compilerOptions)
  )

  const contexts = Array.zipWith(workspace.projects, languageServices, contextFromLanguageService)

  return new WorkspaceServices(languageServices, contexts)
}

const disposeLanguageService = (languageService: ts.LanguageService): Effect.Effect<void> =>
  Effect.sync(() => {
    languageService.dispose()
  })

const releaseWorkspaceServices = (services: WorkspaceServices): Effect.Effect<void> =>
  Effect.forEach(services.languageServices, disposeLanguageService, { discard: true })

const makeWorkspaceUpdateFrom =
  (rootPath: string) =>
  (services: WorkspaceServices): WorkspaceUpdate =>
    new WorkspaceUpdate({
      rootPath,
      contexts: services.contexts
    })

// One-shot Programs share SourceFiles because one scoped DocumentRegistry owns compatible trees.
const materialize = Effect.fn("Watch.workspacePrograms.materialize")(function* (
  workspace: WorkspaceConfigs,
  compilerOptions: ts.CompilerOptions
) {
  const acquireServices = Effect.sync(() => createWorkspaceServices(workspace, compilerOptions))
  const services = yield* Effect.acquireRelease(acquireServices, releaseWorkspaceServices)

  return makeWorkspaceUpdateFrom(workspace.rootPath)(services)
})

export const workspacePrograms = { materialize }
