import * as path from "node:path"
import { Function, Match, pipe, flow } from "effect"
import {
  DirectoryTarget,
  FileTarget,
  NodeTarget,
  PositionTarget,
  WorkspaceTarget,
  type Target,
  type WorkspaceContext
} from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { Location } from "../location/data.js"

const relativePathOrAbsolute = (root: string, fileName: string) => {
  const relative = path.relative(root, fileName)

  return relative || fileName
}

const makeFileStartLocation = (fileName: string) =>
  Location.make({ path: fileName, line: 1, column: 1 })

const makePathLocation = (fileName: string) => Location.make({ path: fileName })

const nodeStartPosition = (node: NodeTarget) => {
  const sourceFile = node.node.getSourceFile()
  const start = node.node.getStart(sourceFile)

  return sourceFile.getLineAndCharacterOfPosition(start)
}

const locateNodeAt = (root: string) => (node: NodeTarget) => {
  const sourceFile = node.node.getSourceFile()
  const position = nodeStartPosition(node)
  const fileName = relativePathOrAbsolute(root, sourceFile.fileName)

  return Location.make({
    path: fileName,
    line: position.line + 1,
    column: position.character + 1
  })
}

const fileTargetPath = (root: string) => (target: FileTarget) =>
  relativePathOrAbsolute(root, target.sourceFile.fileName)

const locateFileAt = (root: string) => flow(fileTargetPath(root), makeFileStartLocation)

const locatePositionAt = (root: string) => (target: PositionTarget) => {
  const fileName = relativePathOrAbsolute(root, target.sourceFile.fileName)

  return Location.make({ path: fileName, line: target.line, column: target.column })
}

const locateDirectory = (target: DirectoryTarget) => makePathLocation(target.path)

const locateWorkspace = (target: WorkspaceTarget) => makePathLocation(target.workspaceRoot)

export const locateTarget = (context: ProgramContext) => (target: Target) => {
  const projectRoot = context.projectRoot
  const fallback = makePathLocation(context.workspaceRoot)

  return pipe(
    Match.value(target),
    Match.tag("NodeTarget", locateNodeAt(projectRoot)),
    Match.tag("FileTarget", locateFileAt(projectRoot)),
    Match.tag("PositionTarget", locatePositionAt(projectRoot)),
    Match.tag("DirectoryTarget", locateDirectory),
    Match.tag("WorkspaceTarget", locateWorkspace),
    Match.orElse(Function.constant(fallback))
  )
}

export const locateWorkspaceTarget = (context: WorkspaceContext) => (target: Target) => {
  const workspaceRoot = context.workspaceRoot
  const fallback = makePathLocation(workspaceRoot)

  return pipe(
    Match.value(target),
    Match.tag("DirectoryTarget", locateDirectory),
    Match.tag("WorkspaceTarget", locateWorkspace),
    Match.tag("FileTarget", locateFileAt(workspaceRoot)),
    Match.tag("PositionTarget", locatePositionAt(workspaceRoot)),
    Match.tag("NodeTarget", locateNodeAt(workspaceRoot)),
    Match.orElse(Function.constant(fallback))
  )
}
