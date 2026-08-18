import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array } from "effect"
import { detectionsForLocatedPolicies } from "@better-typescript/core/engine/policy/locatedPolicyDetections"
import { WorkspaceContext } from "@better-typescript/matchers/matcher/workspaceContext"
import { runWorkspaceMatchers } from "@better-typescript/matchers/matcher/runWorkspaceMatchers"
import { sourceDirectoryPolicy } from "./workspacePolicySourceDirectory.js"
import { sourceFiles } from "./workspacePolicySourceFiles.js"

test("directory policies run after workspace paths are collected", () => {
  const context = new WorkspaceContext({ workspaceRoot: "/workspace", sourceFiles })
  const policies = Array.of(sourceDirectoryPolicy)
  const matches = runWorkspaceMatchers(policies.map((policy) => policy.matcher))(context)
  const detections = detectionsForLocatedPolicies(context)(context.workspaceRoot)(policies)(matches)
  const directoryDetections = detections[0] ?? Array.empty()

  assert.equal(directoryDetections.length, 1)
  assert.equal(directoryDetections[0]?.location.path, "src")
  assert.equal(directoryDetections[0]?.location.line, 0)
  assert.equal(directoryDetections[0]?.location.column, 0)
})
