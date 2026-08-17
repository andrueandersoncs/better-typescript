import { HashMap, pipe } from "effect"
import type { WorkspaceSourceFile } from "@better-typescript/matchers/matcher/workspaceSourceFile"
import type { WiringEntry } from "../wiring/wiringEntry.js"

export const makeWorkspaceFileBucket = (_entry: WiringEntry) =>
  pipe(HashMap.empty<string, WorkspaceSourceFile>(), HashMap.beginMutation)
