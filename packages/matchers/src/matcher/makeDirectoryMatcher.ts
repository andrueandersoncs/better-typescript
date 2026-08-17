import * as path from "node:path"
import { DirectoryTarget } from "./directoryTarget.js"
import { Match } from "./match.js"
import { WorkspaceContext } from "./workspaceContext.js"
import { WorkspaceMatcher } from "./workspaceMatcher.js"
import { WorkspaceSourceFile } from "./workspaceSourceFile.js"
import { Array, Struct, flow, pipe } from "effect"

export const workspaceFileSource = (file: WorkspaceSourceFile) => Struct.get(file, "sourceFile")

export const workspaceFileDirectory = flow(
  Struct.get<WorkspaceSourceFile, "path">("path"),
  path.posix.dirname
)

export const makeDirectoryTarget = (
  directory: string,
  files: ReadonlyArray<WorkspaceSourceFile>
) => {
  const sourceFiles = Array.map(files, workspaceFileSource)

  return new DirectoryTarget({
    path: directory,
    sourceFiles
  })
}

export const matchDirectoryFiles =
  <Fact>(match: (target: DirectoryTarget) => ReadonlyArray<Match<Fact>>) =>
  (directory: string, files: ReadonlyArray<WorkspaceSourceFile>) =>
    pipe(makeDirectoryTarget(directory, files), match)

export const directoryMatchesForContext =
  <Fact>(match: (target: DirectoryTarget) => ReadonlyArray<Match<Fact>>) =>
  (context: WorkspaceContext) => {
    const filesByDirectory = Array.groupBy(context.sourceFiles, workspaceFileDirectory)
    const matchFiles = matchDirectoryFiles(match)

    return pipe(
      Object.entries(filesByDirectory),
      Array.flatMap(([directory, files]) => matchFiles(directory, files))
    )
  }

export const makeDirectoryMatcher = <Fact>(
  match: (target: DirectoryTarget) => ReadonlyArray<Match<Fact>>
) => {
  const workspaceMatch = directoryMatchesForContext(match)

  return new WorkspaceMatcher({ match: workspaceMatch })
}
