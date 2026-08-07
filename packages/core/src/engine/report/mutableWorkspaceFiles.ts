import type { HashMap } from "effect"
import type { WorkspaceSourceFile } from "@better-typescript/matchers/matcher/workspaceSourceFile"

// MutableWorkspaceFiles keys workspace files because policies share matched paths.
export type MutableWorkspaceFiles = HashMap.HashMap<string, WorkspaceSourceFile>
