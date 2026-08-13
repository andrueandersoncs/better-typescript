import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferInferredTypes } from "@better-typescript/guidance/preset/defaultWiring"
import { preferInferredTypesMatcher } from "@better-typescript/matchers/builtins/preferInferredTypes"
import { runMatchers } from "@better-typescript/matchers/matcher/runMatchers"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
import { fixturesRoot } from "./ruleTestFixturesRoot.js"

test("prefer-inferred-types reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferInferredTypes))

test("prefer-inferred-types remains active with unused diagnostics enabled", () =>
  assertPolicyFixture(preferInferredTypes, {
    noUnusedLocals: true,
    noUnusedParameters: true
  }))

test("prefer-inferred-types caches each matcher file scope independently", async () => {
  const fixturePath = path.join(fixturesRoot, preferInferredTypes.name)
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const matcher = Array.of(preferInferredTypesMatcher)
  const includesAllowed = (_matcherIndex: number, sourceFile: import("typescript").SourceFile) =>
    sourceFile.fileName.endsWith("allowed.ts")
  const includesCases = (_matcherIndex: number, sourceFile: import("typescript").SourceFile) =>
    sourceFile.fileName.endsWith("cases.ts")

  const allowedMatches = runMatchers(matcher)(includesAllowed)(context)
  const caseMatches = runMatchers(matcher)(includesCases)(context)

  assert.equal(allowedMatches[0]?.length, 0)
  assert.ok((caseMatches[0]?.length ?? 0) > 0)
})
