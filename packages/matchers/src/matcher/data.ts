import { Data, Schema } from "effect"
import type * as ts from "typescript"
import type { ProgramContext } from "../sources/data.js"
import { SourceComment } from "../sources/commentsData.js"
import { TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

const sourceCommentsSchema = Schema.Array(SourceComment)

// MatchContext carries checkers and comments because matchers share one per-file view.
export const MatchContext = Schema.Struct({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile,
  comments: sourceCommentsSchema
})

export interface MatchContext extends Schema.Schema.Type<typeof MatchContext> {}

// NodeTarget pins a fact to one AST node because node-local policies cannot use file spans alone.
export class NodeTarget extends Data.TaggedClass("NodeTarget")<{
  readonly node: ts.Node
}> {}

// FileTarget pins a fact to one source file because file-level policies have no single node.
export class FileTarget extends Data.TaggedClass("FileTarget")<{
  readonly sourceFile: ts.SourceFile
}> {}

// PositionTarget pins a fact to a line and column because diagnostics lack a stable node handle.
export class PositionTarget extends Data.TaggedClass("PositionTarget")<{
  readonly sourceFile: ts.SourceFile
  readonly line: number
  readonly column: number
}> {}

// DirectoryTarget groups source files under one path because directory policies span many files.
export class DirectoryTarget extends Data.TaggedClass("DirectoryTarget")<{
  readonly path: string
  readonly sourceFiles: ReadonlyArray<ts.SourceFile>
}> {}

// WorkspaceTarget covers the whole workspace root because some policies are repo-global.
export class WorkspaceTarget extends Data.TaggedClass("WorkspaceTarget")<{
  readonly workspaceRoot: string
  readonly sourceFiles: ReadonlyArray<ts.SourceFile>
}> {}

// Target is the shared location union because Match must carry one address vocabulary.
export type Target = NodeTarget | FileTarget | PositionTarget | DirectoryTarget | WorkspaceTarget

// Match is a factual observation because user-facing prose belongs to core Guidance.
export class Match<Fact> extends Data.Class<{
  readonly target: Target
  readonly fact: Fact
}> {}

export const makeNodeTarget = (node: ts.Node) => new NodeTarget({ node })

export const makeFileTarget = (sourceFile: ts.SourceFile) => new FileTarget({ sourceFile })

export const makePositionTarget = (sourceFile: ts.SourceFile, line: number, column: number) =>
  new PositionTarget({ sourceFile, line, column })

export const makeNodeMatch = <Fact>(node: ts.Node, fact: Fact) => {
  const target = makeNodeTarget(node)

  return new Match({ target, fact })
}

export const makeFileMatch = <Fact>(sourceFile: ts.SourceFile, fact: Fact) => {
  const target = makeFileTarget(sourceFile)

  return new Match({ target, fact })
}

export const makePositionMatch = <Fact>(
  sourceFile: ts.SourceFile,
  line: number,
  column: number,
  fact: Fact
) => {
  const target = makePositionTarget(sourceFile, line, column)

  return new Match({ target, fact })
}

export const makeDirectoryMatch = <Fact>(target: DirectoryTarget, fact: Fact) =>
  new Match({ target, fact })

export const makeWorkspaceMatch = <Fact>(target: WorkspaceTarget, fact: Fact) =>
  new Match({ target, fact })

export const nodeTarget = makeNodeTarget
export const fileTarget = makeFileTarget
export const positionTarget = makePositionTarget
export const nodeMatch = makeNodeMatch
export const fileMatch = makeFileMatch
export const positionMatch = makePositionMatch
export const directoryMatch = makeDirectoryMatch
export const workspaceMatch = makeWorkspaceMatch

type NodeHandler = (context: MatchContext) => (node: ts.Node) => ReadonlyArray<Match<unknown>>

type FileHandler = (context: MatchContext) => ReadonlyArray<Match<unknown>>

// NodeSubscription carries syntax kinds because planners group matchers for fused dispatch.
export class NodeSubscription extends Data.Class<{
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: NodeHandler
}> {}

// FileSubscription carries a file matcher because it runs once per included source file.
export class FileSubscription extends Data.Class<{
  readonly handler: FileHandler
}> {}

// Subscription is the planner unit union because fused run accepts node and file plans together.
export type Subscription = NodeSubscription | FileSubscription

// Matcher is a program-stage recognition plan because reporting and guidance stay outside matching.
export class Matcher extends Data.Class<{
  readonly plan: (context: ProgramContext) => ReadonlyArray<Subscription>
  readonly compilerOptions: ts.CompilerOptions
}> {}

// WorkspaceSourceFile pairs path and SourceFile because workspace policies key by path.
export class WorkspaceSourceFile extends Data.Class<{
  readonly path: string
  readonly sourceFile: ts.SourceFile
}> {}

export const makeWorkspaceSourceFile = (path: string, sourceFile: ts.SourceFile) =>
  new WorkspaceSourceFile({ path, sourceFile })

// WorkspaceContext holds path-normalized files because workspace matchers need them first.
export class WorkspaceContext extends Data.Class<{
  readonly workspaceRoot: string
  readonly sourceFiles: ReadonlyArray<WorkspaceSourceFile>
}> {}

export const makeWorkspaceContext = (
  workspaceRoot: string,
  sourceFiles: ReadonlyArray<WorkspaceSourceFile>
) => new WorkspaceContext({ workspaceRoot, sourceFiles })

// WorkspaceMatcher runs after collection because program matchers lack path grouping.
export class WorkspaceMatcher extends Data.Class<{
  readonly match: (context: WorkspaceContext) => ReadonlyArray<Match<unknown>>
}> {}
