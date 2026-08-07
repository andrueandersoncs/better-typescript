import * as fs from "node:fs"
import * as path from "node:path"
import { packageExampleRoot } from "./packageExampleRoot.js"

export const packageExamplePairRoots = (name: string): ReadonlyArray<string> => {
  const exampleRoot = packageExampleRoot(name)

  if (!fs.existsSync(exampleRoot)) {
    return []
  }

  return fs
    .readdirSync(exampleRoot, { withFileTypes: true })
    .flatMap((entry) => {
      if (!entry.isDirectory()) {
        return []
      }

      const pairRoot = path.join(exampleRoot, entry.name)
      const badRoot = path.join(pairRoot, "bad")
      const goodRoot = path.join(pairRoot, "good")
      const complete =
        fs.existsSync(badRoot) &&
        fs.statSync(badRoot).isDirectory() &&
        fs.existsSync(goodRoot) &&
        fs.statSync(goodRoot).isDirectory()

      return complete ? [pairRoot] : []
    })
    .slice()
    .sort((left, right) =>
      path.basename(left).localeCompare(path.basename(right), undefined, { numeric: true })
    )
}
