import * as ts from "typescript"

export const unusedCompilerOptions: ts.CompilerOptions = {
  noEmit: true,
  noUnusedLocals: true,
  noUnusedParameters: true
}
