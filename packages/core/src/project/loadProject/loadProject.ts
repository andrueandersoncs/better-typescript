import * as path from "node:path"
import { Array, Effect, Equivalence, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { CircularProjectReferenceError } from "./circularProjectReferenceError.js"
import { InvalidTsconfigError } from "./invalidTsconfigError.js"
import { LoadedProject } from "./loadedProject.js"
import { ProjectConfig } from "./projectConfig.js"
import { WorkspaceConfigs } from "./workspaceConfigs.js"

const loadedProjectsSchema = Schema.Array(LoadedProject)
const sameString = Equivalence.strictEqual<string>()

const analysisCompilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}

const defaultCompilerOptions: ts.CompilerOptions = {}

// LoadedWorkspace keeps project programs together because lint rules need workspace-relative context.
export const LoadedWorkspace = Schema.Struct({
  rootPath: Schema.String,
  projects: loadedProjectsSchema
})

export interface LoadedWorkspace extends Schema.Schema.Type<typeof LoadedWorkspace> {}

// MissingTsconfigError identifies discovery failure because callers need the searched root path.
export class MissingTsconfigError extends Schema.TaggedErrorClass<MissingTsconfigError>()(
  "MissingTsconfigError",
  {
    rootPath: Schema.String
  }
) {
  get message(): string {
    return `Could not find tsconfig.json from ${this.rootPath}`
  }
}

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

  const ancestorConfigPaths = HashSet.empty<string>()
  const discoveredProjects = yield* discoverConfig(ancestorConfigPaths)(configPath.value)

  const projects = Array.dedupeWith(discoveredProjects, (self, that) =>
    sameString(that.configPath, self.configPath)
  )

  const workspaceRoot = path.dirname(configPath.value)

  return new WorkspaceConfigs({ rootPath: workspaceRoot, projects })
})

const loadProjectConfig = (compilerOptions: ts.CompilerOptions) => (config: ProjectConfig) => {
  const options = Object.assign({}, config.parsed.options, analysisCompilerOptions, compilerOptions)
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

// DefaultLoadProjectInput preserves the minimal call because compiler overrides are uncommon.
interface DefaultLoadProjectInput {
  readonly projectPath: string
}

// ConfiguredLoadProjectInput adds overrides because fixture analysis must vary compiler diagnostics.
interface ConfiguredLoadProjectInput extends DefaultLoadProjectInput {
  readonly compilerOptions: ts.CompilerOptions
}

// LoadProjectInput preserves both call shapes because TypeScript optional fields encode undefined.
type LoadProjectInput = DefaultLoadProjectInput | ConfiguredLoadProjectInput

const compilerOptionsFrom = (input: LoadProjectInput) =>
  "compilerOptions" in input ? input.compilerOptions : defaultCompilerOptions

export const loadProject = Effect.fn("LoadProject.load")(function* (input: LoadProjectInput) {
  const workspace = yield* discoverWorkspace(input.projectPath)
  const compilerOptions = compilerOptionsFrom(input)
  const projects = Array.map(workspace.projects, loadProjectConfig(compilerOptions))

  return LoadedWorkspace.make({ rootPath: workspace.rootPath, projects })
})

const discoverConfig: (
  ancestorConfigPaths: HashSet.HashSet<string>
) => (
  configPath: string
) => Effect.Effect<
  ReadonlyArray<ProjectConfig>,
  CircularProjectReferenceError | InvalidTsconfigError
> = (ancestorConfigPaths) =>
  Effect.fn("LoadProject.discoverConfig")(function* (configPath: string) {
    if (HashSet.has(ancestorConfigPaths, configPath)) {
      return yield* new CircularProjectReferenceError({ configPath })
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
    const configError = Option.fromNullishOr(configFile.error)

    if (Option.isSome(configError)) {
      const diagnostics = Array.of(configError.value)
      const message = formatDiagnostics(diagnostics)

      return yield* new InvalidTsconfigError({ message })
    }

    const configDirectory = path.dirname(configPath)
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDirectory)

    if (parsedConfig.errors.length > 0) {
      const message = formatDiagnostics(parsedConfig.errors)

      return yield* new InvalidTsconfigError({ message })
    }

    const references = parsedConfig.projectReferences ?? Array.empty()
    const hasNoOwnFiles = Equivalence.strictEqual<number>()(0, parsedConfig.fileNames.length)
    const hasReferences = references.length > 0
    const isReferenceOnlyConfig = hasNoOwnFiles && hasReferences

    if (isReferenceOnlyConfig) {
      const nextAncestorConfigPaths = HashSet.add(ancestorConfigPaths, configPath)

      const referencedProjects = yield* Effect.forEach(
        references,
        discoverReferencedProjects(nextAncestorConfigPaths)
      )

      return Array.flatten(referencedProjects)
    }

    const project = new ProjectConfig({ configPath, parsed: parsedConfig })

    return Array.of(project)
  })

const discoverReferencedProjects =
  (ancestorConfigPaths: HashSet.HashSet<string>) => (reference: ts.ProjectReference) => {
    const configPath = ts.resolveProjectReferencePath(reference)
    const discoverProjects = discoverConfig(ancestorConfigPaths)

    return discoverProjects(configPath)
  }

const formatDiagnostics = (diagnostics: ReadonlyArray<ts.Diagnostic>) =>
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: Function.identity,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: Function.constant(ts.sys.newLine)
  })
