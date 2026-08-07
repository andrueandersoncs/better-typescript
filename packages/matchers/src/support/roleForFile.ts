import type * as ts from "typescript"
import type { ArchitectureRole } from "./architectureRoleType.js"
import { HashMap } from "effect"

export const roleForFile =
  (roles: HashMap.HashMap<string, ArchitectureRole>) => (sourceFile: ts.SourceFile) =>
    HashMap.get(roles, sourceFile.fileName)
