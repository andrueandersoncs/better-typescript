import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array } from "effect"
import { toWorkspacePolicies } from "@better-typescript/core/engine/reportPipeline"
import { WorkspaceContext } from "@better-typescript/matchers/matcher/workspaceContext"
import { sourceDirectoryPolicy } from "./workspacePolicySourceDirectory.js"
import { sourceFiles } from "./workspacePolicySourceFiles.js"

test("directory policies run after workspace paths are collected", () => {
  const context = new WorkspaceContext({ workspaceRoot: "/workspace", sourceFiles })
  const detections = toWorkspacePolicies(Array.of(sourceDirectoryPolicy))(context)
  const directoryDetections = detections[0] ?? Array.empty()

  assert.equal(directoryDetections.length, 1)
  assert.equal(directoryDetections[0]?.location.path, "src")
  assert.equal(directoryDetections[0]?.location.line, 0)
  assert.equal(directoryDetections[0]?.location.column, 0)
})
