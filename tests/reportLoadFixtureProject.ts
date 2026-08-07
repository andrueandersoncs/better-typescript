import * as assert from "node:assert/strict"
import type { LoadedProject } from "@better-typescript/core/project/loadProject/loadedProject"
import { loadFixtureWorkspace } from "./reportLoadFixtureWorkspace.js"

export const loadFixtureProject = async (name: string): Promise<LoadedProject> => {
  const workspace = await loadFixtureWorkspace(name)
  const [project] = workspace.projects

  assert.ok(project, `expected ${name} fixture to load one TypeScript project`)

  return project
}
