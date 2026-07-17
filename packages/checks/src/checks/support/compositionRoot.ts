import * as path from "node:path"
import { HashSet } from "effect"
import type * as ts from "typescript"

const compositionRootNames = HashSet.make(
  "main",
  "index",
  "bootstrap",
  "runtime",
  "layer",
  "wiring"
)

export const isCompositionRoot = (sourceFile: ts.SourceFile): boolean => {
  const extension = path.extname(sourceFile.fileName)
  const baseName = path.basename(sourceFile.fileName, extension)

  return HashSet.has(compositionRootNames, baseName)
}
