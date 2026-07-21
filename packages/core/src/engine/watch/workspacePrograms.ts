import { Array, Effect, Function, HashMap, MutableRef, Option, pipe } from "effect"
import * as ts from "typescript"
import { makeContext } from "@better-typescript/matchers/sources"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
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
  documentRegistryFor: (options: ts.CompilerOptions) => ts.DocumentRegistry,
  snapshots: MutableRef.MutableRef<HashMap.HashMap<string, ts.IScriptSnapshot>>,
  config: ProjectConfig,
  compilerOptions: ts.CompilerOptions
) => {
  const options = withAnalysisCompilerOptions(config.parsed.options, compilerOptions)
  const documentRegistry = documentRegistryFor(options)
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
  // Isolate option buckets because registries must release the documents they acquired.
  const keyRegistry = ts.createDocumentRegistry(
    ts.sys.useCaseSensitiveFileNames,
    workspace.rootPath,
    analysisJsDocParsingMode
  )

  const emptyRegistries = HashMap.empty<string, ts.DocumentRegistry>()
  const registries = MutableRef.make(emptyRegistries)

  const documentRegistryFor = (options: ts.CompilerOptions) => {
    const key = keyRegistry.getKeyForCompilationSettings(options)
    const currentRegistries = MutableRef.get(registries)
    const existing = HashMap.get(currentRegistries, key)

    if (Option.isSome(existing)) {
      return existing.value
    }

    const documentRegistry = ts.createDocumentRegistry(
      ts.sys.useCaseSensitiveFileNames,
      workspace.rootPath,
      analysisJsDocParsingMode
    )

    const latestRegistries = MutableRef.get(registries)
    const updated = HashMap.set(latestRegistries, key, documentRegistry)

    MutableRef.set(registries, updated)

    return documentRegistry
  }

  const emptySnapshots = HashMap.empty<string, ts.IScriptSnapshot>()
  const snapshots = MutableRef.make(emptySnapshots)

  const makeLanguageServiceForProject = (config: ProjectConfig) =>
    createProjectLanguageService(documentRegistryFor, snapshots, config, compilerOptions)

  const languageServices = Array.map(workspace.projects, makeLanguageServiceForProject)
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
