import * as path from "node:path"

export const relativeWorkspacePath = (
  workspaceRoot: string,
  projectRoot: string,
  candidatePath: string
) => {
  const absoluteCandidatePath = path.resolve(projectRoot, candidatePath)

  return path.relative(workspaceRoot, absoluteCandidatePath).replaceAll(path.sep, "/")
}
