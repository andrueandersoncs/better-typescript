import * as path from "node:path"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-mutable-variable-declarations"

type MutableVariableDeclarationKind = "let" | "var"

interface MutableVariableDeclarationMatch {
  readonly declarationList: ts.VariableDeclarationList
  readonly kind: MutableVariableDeclarationKind
}

export const noMutableVariableDeclarations: Rule = {
  id: ruleId,
  description: "Disallow let and var declarations in favor of immutable const bindings.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isVariableDeclarationList),
        Stream.map((declarationList) =>
          mutableVariableDeclarationMatch(context, declarationList)
        ),
        Stream.filter(isDefined),
        Stream.map((match) => createMatch(context, match)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const mutableVariableDeclarationMatch = (
  context: RuleContext,
  declarationList: ts.VariableDeclarationList
): MutableVariableDeclarationMatch | undefined => {
  const kind = mutableVariableDeclarationKind(context.sourceFile, declarationList)

  if (kind === undefined) {
    return undefined
  }

  return {
    declarationList,
    kind
  }
}

const mutableVariableDeclarationKind = (
  sourceFile: ts.SourceFile,
  declarationList: ts.VariableDeclarationList
): MutableVariableDeclarationKind | undefined => {
  const firstToken = declarationList.getFirstToken(sourceFile)

  switch (firstToken?.kind) {
    case ts.SyntaxKind.LetKeyword:
      return "let"
    case ts.SyntaxKind.VarKeyword:
      return "var"
    default:
      return undefined
  }
}

const createMatch = (
  context: RuleContext,
  match: MutableVariableDeclarationMatch
): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = match.declarationList.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: `Avoid declaring mutable variables with ${match.kind}.`,
    hint:
      "Declare multiple const values to represent each state instead of mutating a single " +
      "variable, and use immutable values that are not reassigned."
  }
}

const isDefined = <A>(value: A | undefined): value is A => value !== undefined

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
