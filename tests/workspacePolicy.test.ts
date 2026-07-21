import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array } from "effect"
import * as ts from "typescript"
import {
  defineWorkspacePolicy,
  oneFinding,
  runWorkspacePolicies
} from "@better-typescript/core/engine/policy"
import {
  WorkspaceContext,
  WorkspaceSourceFile,
  directoryMatch
} from "@better-typescript/matchers/matcher/data"
import { directoryMatcher } from "@better-typescript/matchers/matcher"

interface DirectoryFact {
  readonly fileCount: number
}

const directoryFact = (fileCount: number): DirectoryFact => ({ fileCount })

const sourceFile = (fileName: string) =>
  ts.createSourceFile(fileName, "export const value = 1", ts.ScriptTarget.ES2022)

const sourceFiles = Array.make(
  new WorkspaceSourceFile({ path: "src/one.ts", sourceFile: sourceFile("one.ts") }),
  new WorkspaceSourceFile({ path: "src/two.ts", sourceFile: sourceFile("two.ts") }),
  new WorkspaceSourceFile({ path: "test/one.test.ts", sourceFile: sourceFile("one.test.ts") })
)

const sourceDirectoryMatcher = directoryMatcher((target) => {
  if (target.path !== "src") {
    return Array.empty()
  }

  return Array.of(directoryMatch(target, directoryFact(target.sourceFiles.length)))
})

const sourceDirectoryPolicy = defineWorkspacePolicy({
  name: "source-directory",
  matcher: sourceDirectoryMatcher,
  guidance: () => (match) =>
    oneFinding(
      match.target,
      "Source directory.",
      "Keep source files together intentionally.",
      match.fact
    ),
  examples: { _tag: "inline", examples: Array.empty() }
})

test("directory policies run after workspace paths are collected", () => {
  const context = new WorkspaceContext({ workspaceRoot: "/workspace", sourceFiles })
  const detections = runWorkspacePolicies(Array.of(sourceDirectoryPolicy))(context)
  const directoryDetections = detections[0] ?? Array.empty()

  assert.equal(directoryDetections.length, 1)
  assert.equal(directoryDetections[0]?.location.path, "src")
  assert.equal(directoryDetections[0]?.location.line, 0)
  assert.equal(directoryDetections[0]?.location.column, 0)
})
