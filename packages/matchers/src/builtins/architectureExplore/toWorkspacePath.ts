import * as path from "node:path"

// Workspace paths normalize evidence because cross-package joins compare one path vocabulary.
export const toWorkspacePath =
  (projectRoot: string, workspaceRoot: string) => (projectRelativePath: string) => {
    const projectPath = path.resolve(projectRoot, projectRelativePath)
    const workspacePath = path.relative(workspaceRoot, projectPath)

    return workspacePath.replaceAll(path.sep, "/")
  }
