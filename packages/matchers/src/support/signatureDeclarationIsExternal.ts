import * as ts from "typescript"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"

export const signatureDeclarationIsExternal = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()

  return !isProjectSourceFile(sourceFile)
}
