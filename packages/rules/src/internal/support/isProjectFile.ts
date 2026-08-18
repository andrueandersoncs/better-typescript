import * as ts from "typescript"

export const isProjectFile = (sourceFile: ts.SourceFile) =>
  !sourceFile.fileName.replaceAll("\\", "/").includes("/node_modules/")
