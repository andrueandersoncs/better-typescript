import { Array, Effect, Option, Ref, Schema, pipe } from "effect"
import type { LintConfig } from "../config/config.js"
import { loadConfig } from "../config/loadConfig.js"
import { LintRequest } from "../linter/lintRequest.js"
import { Violation, lintConfigured } from "../linter/linter.js"
import type { Rule } from "../linter/linter.js"
import { normalizeViolations } from "../linter/normalizeViolations.js"
import { LoadedWorkspace, discoverWorkspace } from "../project/loadProject/loadProject.js"
import { loadProjectConfig } from "../project/loadProject/loadProjectConfig.js"
import type { LoadedProject } from "../project/loadProject/loadedProject.js"
import type { ProjectConfig } from "../project/loadProject/projectConfig.js"

const emptyCompilerOptions = {}
const noLoadedProject = Option.none<LoadedProject>()
const violationArray = Schema.Array(Violation)

// AnalysisResult is the complete owned-run output because compiler Programs never escape it.
export const AnalysisResult = Schema.Struct({
  rootPath: Schema.String,
  violations: violationArray
})

export interface AnalysisResult extends Schema.Schema.Type<typeof AnalysisResult> {}

// AnalysisRequest stays small because discovery and root configuration belong to the run.
export interface AnalysisRequest {
  readonly projectPath: string
  readonly rules: ReadonlyArray<Rule>
}

const acquireProject = Effect.fn("Analysis.acquireProject")(function* (config: ProjectConfig) {
  return yield* pipe(
    Effect.sync(() => loadProjectConfig(emptyCompilerOptions)(config)),
    Effect.map(Option.some<LoadedProject>),
    Effect.flatMap(Ref.make)
  )
})

const releaseProject = Effect.fn("Analysis.releaseProject")(function* (
  project: Ref.Ref<Option.Option<LoadedProject>>
) {
  return yield* Ref.set(project, noLoadedProject)
})

const lintProject = Effect.fn("Analysis.lintProject")(function* (
  rootPath: string,
  config: LintConfig,
  rules: ReadonlyArray<Rule>,
  project: Ref.Ref<Option.Option<LoadedProject>>
) {
  const projectOption = yield* Ref.get(project)
  const loadedProject = pipe(projectOption, Option.getOrThrow)
  const workspace = LoadedWorkspace.make({ rootPath, projects: [loadedProject] })
  const request = LintRequest.make({ project: workspace, rules })

  return yield* Effect.sync(() => lintConfigured(config)(request))
})

export const runAnalysis = Effect.fn("Analysis.run")(function* (request: AnalysisRequest) {
  const workspace = yield* discoverWorkspace(request.projectPath)
  const config = yield* loadConfig(workspace.rootPath)

  const runProject = Effect.fn("Analysis.runProject")(function* (projectConfig: ProjectConfig) {
    const projectAcquisition = Effect.fn("Analysis.projectAcquisition")(function* () {
      return yield* acquireProject(projectConfig)
    })()

    const useProject = Effect.fn("Analysis.useProject")(function* (
      project: Ref.Ref<Option.Option<LoadedProject>>
    ) {
      return yield* lintProject(workspace.rootPath, config, request.rules, project)
    })

    return yield* Effect.acquireUseRelease(projectAcquisition, useProject, releaseProject)
  })

  const projectViolations = yield* Effect.forEach(workspace.projects, runProject, {
    concurrency: 1
  })

  const violations = pipe(projectViolations, Array.flatten, normalizeViolations)

  return AnalysisResult.make({ rootPath: workspace.rootPath, violations })
})
