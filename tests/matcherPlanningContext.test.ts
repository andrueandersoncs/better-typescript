import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "bun:test"
import { Array, Effect, MutableList, Option, Order, Tuple, pipe } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { makeMatcherFromSubscriptions, runMatchers } from "@better-typescript/matchers/matcher"
import { makeContext } from "@better-typescript/matchers/sources"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence-workspace")

const relativeSourcePaths = (
  projectRoot: string,
  sourceFiles: ReadonlyArray<import("typescript").SourceFile>
) =>
  pipe(
    sourceFiles,
    Array.map((sourceFile) =>
      path.relative(projectRoot, sourceFile.fileName).replaceAll(path.sep, "/")
    ),
    Array.sort(Order.String)
  )

const recordingMatcher = (
  name: string,
  plannedScopes: MutableList.MutableList<readonly [string, ReadonlyArray<string>]>
) =>
  makeMatcherFromSubscriptions((context) => {
    const sourcePaths = relativeSourcePaths(context.projectRoot, context.sourceFiles)

    MutableList.append(plannedScopes, Tuple.make(name, sourcePaths))

    return Array.empty()
  })

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
