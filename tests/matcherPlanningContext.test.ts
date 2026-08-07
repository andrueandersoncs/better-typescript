import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect, MutableList, Option, pipe } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runMatchers } from "@better-typescript/matchers/matcher/runMatchers"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { fixturePath } from "./matcherPlanningContextFixturePath.js"
import { recordingMatcher } from "./matcherPlanningRecordingMatcher.js"

test("plans each matcher with its exact included first-party sources", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = pipe(
    workspace.projects,
    Array.findFirst(
      (candidate) => path.relative(workspace.rootPath, candidate.rootPath) === "packages/lib"
    ),
    Option.getOrThrow
  )
  const context = makeContext(project.rootPath)(project.program)
  const plannedScopes = MutableList.make<readonly [string, ReadonlyArray<string>]>()
  const matchers = Array.make(
    recordingMatcher("all", plannedScopes),
    recordingMatcher("util", plannedScopes),
    recordingMatcher("none", plannedScopes)
  )
  const includesSourceFile = (
    matcherIndex: number,
    sourceFile: import("typescript").SourceFile
  ) => {
    if (matcherIndex === 0) {
      return true
    }

    if (matcherIndex === 1) {
      return sourceFile.fileName.endsWith("util.ts")
    }

    return false
  }

  runMatchers(matchers)(includesSourceFile)(context)

  assert.deepEqual(MutableList.toArray(plannedScopes), [
    ["all", ["src/extra.ts", "src/util.ts"]],
    ["util", ["src/util.ts"]]
  ])
})
