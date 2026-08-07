import * as fs from "node:fs"
import * as path from "node:path"

// Skip package library surfaces because test-only use does not prove an internal test seam.
export const isPackageProject =
  (workspaceRoot: string) =>
  (projectRoot: string): boolean => {
    const workspacePath = path.relative(workspaceRoot, projectRoot).replaceAll(path.sep, "/")
    const isPackagesPath = workspacePath.startsWith("packages/")
    const workspaceConfigPath = path.join(workspaceRoot, "better-typescript.config.ts")
    const projectPackagePath = path.join(projectRoot, "package.json")
    const hasWorkspaceConfig = fs.existsSync(workspaceConfigPath)
    const hasProjectPackage = fs.existsSync(projectPackagePath)
    const hasPackageMarkers = hasWorkspaceConfig && hasProjectPackage

    return isPackagesPath && hasPackageMarkers
  }
