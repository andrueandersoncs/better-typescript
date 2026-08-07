import * as path from "node:path"

export const relativePathOrAbsolute = (root: string, fileName: string) => {
  const relative = path.relative(root, fileName)

  return relative || fileName
}
