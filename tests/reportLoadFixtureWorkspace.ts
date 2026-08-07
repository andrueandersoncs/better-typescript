import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import type { LoadedWorkspace } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./reportTestFixturePath.js"

export const loadFixtureWorkspace = (name: string): Promise<LoadedWorkspace> =>
  Effect.runPromise(loadProject(fixturePath(name)))
