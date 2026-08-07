import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect, Order, pipe } from "effect"
import { compositionForwarders } from "@better-typescript/guidance/preset/compositionForwarders"
import { moduleScopeEffects } from "@better-typescript/guidance/preset/moduleScopeEffects"
import { testOnlyExports } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { isTestPath } from "@better-typescript/matchers/builtins/architectureExplore/isTestPath"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./workspaceTestClassificationFixturePath.js"
import { isUnderTestsDirectory } from "./workspaceTestClassificationIsUnderTestsDirectory.js"
import { runWorkspaceChecks } from "./workspaceTestClassificationRunChecks.js"

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
