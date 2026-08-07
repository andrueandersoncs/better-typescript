import { Effect } from "effect"
import * as ts from "typescript"
import { workspacePrograms } from "@better-typescript/core/engine/watch/workspacePrograms"
import type { WorkspaceConfigs } from "@better-typescript/core/project/loadProject/workspaceConfigs"

export const collectPrograms = (
  workspace: WorkspaceConfigs,
  compilerOptions: ts.CompilerOptions = {}
) => Effect.scoped(workspacePrograms.materialize(workspace, compilerOptions))
