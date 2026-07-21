import * as path from "node:path"

export const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
  const relative = path.relative(projectRoot, fileName).replaceAll("\\", "/")

  return relative || fileName
}
