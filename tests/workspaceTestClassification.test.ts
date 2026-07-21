import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect, Function, Order, pipe } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { makeContext } from "@better-typescript/matchers/sources"
import { runPolicies } from "@better-typescript/core/engine/policy"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { compositionForwarders } from "@better-typescript/guidance/policies/compositionForwarders"
import { moduleScopeEffects } from "@better-typescript/guidance/policies/moduleScopeEffects"
import { testOnlyExports } from "@better-typescript/guidance/policies/testOnlyExports"
import { isTestPath } from "@better-typescript/matchers/builtins/architectureExplore/paths"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "workspace-test-helpers")

const includeEverySourceFile = Function.constant(true)

// Detections carry project-relative paths, so joins against the fixture use workspace paths.
const workspacePathFor =
  (workspaceRoot: string, projectRoot: string) =>
  (detection: Detection): string => {
    const absolutePath = path.resolve(projectRoot, detection.location.path)

    return path.relative(workspaceRoot, absolutePath).replaceAll(path.sep, "/")
  }

const runWorkspaceChecks = async (
  policies: ReadonlyArray<Policy>
): Promise<ReadonlyArray<ReadonlyArray<string>>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const executablePolicies = policies

  return Array.reduce(
    workspace.projects,
    Array.map(executablePolicies, () => Array.empty<string>()),
    (current, project) => {
      const loaded = makeContext(project.rootPath)(project.program)

      const context = ProgramContext.make({
        program: loaded.program,
        checker: loaded.checker,
        projectRoot: loaded.projectRoot,
        workspaceRoot: workspace.rootPath
      })

      const projectDetections = runPolicies(executablePolicies)(includeEverySourceFile)(context)
      const toWorkspacePath = workspacePathFor(workspace.rootPath, project.rootPath)

      return Array.map(current, (paths, checkIndex) => {
        const detections = projectDetections[checkIndex] ?? Array.empty<Detection>()

        return Array.appendAll(paths, Array.map(detections, toWorkspacePath))
      })
    }
  )
}

const isUnderTestsDirectory = (workspacePath: string): boolean => workspacePath.startsWith("tests/")

test("benchmarks are test-like architecture consumers", () => {
  assert.equal(isTestPath("bench/selfHost.ts"), true)
  assert.equal(isTestPath("packages/core/src/engine/watch.ts"), false)
})

test("fixture discovers src and tests projects", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const relativeRoots = pipe(
    workspace.projects,
    Array.map((project) =>
      path.relative(workspace.rootPath, project.rootPath).replaceAll(path.sep, "/")
    ),
    Array.sort(Order.String)
  )

  assert.deepEqual(relativeRoots, ["src", "tests"])
})

test("tests-project helpers stay silent while src control still fires", async () => {
  const checks = Array.make(compositionForwarders, testOnlyExports, moduleScopeEffects)
  const pathsByCheck = await runWorkspaceChecks(checks)

  const forwarderPaths = pathsByCheck[0] ?? Array.empty<string>()
  const testOnlyPaths = pathsByCheck[1] ?? Array.empty<string>()
  const moduleScopePaths = pathsByCheck[2] ?? Array.empty<string>()

  assert.deepEqual(
    Array.filter(forwarderPaths, isUnderTestsDirectory),
    [],
    "expected zero composition-forwarders detections for workspace test helpers"
  )

  assert.deepEqual(
    Array.filter(testOnlyPaths, isUnderTestsDirectory),
    [],
    "expected zero test-only-exports detections for workspace test helpers"
  )

  assert.deepEqual(
    Array.filter(moduleScopePaths, isUnderTestsDirectory),
    [],
    "expected zero module-scope-effects detections for workspace test helpers"
  )

  assert.deepEqual(
    forwarderPaths,
    ["src/control.ts"],
    "expected the src control forwarder to keep firing composition-forwarders"
  )
})
