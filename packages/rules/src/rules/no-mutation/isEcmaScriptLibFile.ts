import { Array } from "effect"
import type * as ts from "typescript"

// Recognize only ECMAScript lib values as built-ins because hosts and packages stay external.
const ecmaScriptLibPrefixes: ReadonlyArray<string> = Array.make(
  "lib.es",
  "lib.decorators",
  "lib.d.ts"
)

export const isEcmaScriptLibFile = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")
  const separatorIndex = normalized.lastIndexOf("/")
  const baseName = normalized.slice(separatorIndex + 1)

  return Array.some(ecmaScriptLibPrefixes, (prefix) => baseName.startsWith(prefix))
}
