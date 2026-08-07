import * as path from "node:path"
import { Array, pipe } from "effect"
import * as ts from "typescript"
import type { LoadedProject } from "@better-typescript/core/project/loadProject/loadedProject"
import { astNodesIn } from "@better-typescript/matchers/sources/astNodesIn"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"

const relativeFileName = (project: LoadedProject, sourceFile: ts.SourceFile): string =>
  path.relative(project.rootPath, sourceFile.fileName).replaceAll(path.sep, "/")
const nodeSignature =
  (project: LoadedProject) =>
  ({
    sourceFile,
    node
  }: {
    readonly sourceFile: ts.SourceFile
    readonly node: ts.Node
  }): string => {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))

    return [
      relativeFileName(project, sourceFile),
      ts.SyntaxKind[node.kind],
      position.line + 1,
      position.character + 1
    ].join(":")
  }
export const collectAstSignatures = (project: LoadedProject): ReadonlyArray<string> => {
  const sourceFiles = pipe(project.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const signature = nodeSignature(project)

  return Array.flatMap(sourceFiles, (sourceFile) =>
    pipe(
      Array.fromIterable(astNodesIn(sourceFile)),
      Array.map((node) => signature({ sourceFile, node }))
    )
  )
}
