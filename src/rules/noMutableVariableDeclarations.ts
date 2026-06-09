import * as path from "node:path"
import { Chunk, Effect, Option, Stream } from "effect"
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
        Stream.filterMap((declarationList) =>
          mutableVariableDeclarationMatch(context, declarationList)
        ),
        Stream.map((match) => createMatch(context, match)),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const mutableVariableDeclarationMatch = (
  context: RuleContext,
  declarationList: ts.VariableDeclarationList
): Option.Option<MutableVariableDeclarationMatch> => {
  const kind = mutableVariableDeclarationKind(context.sourceFile, declarationList)

  return Option.match(kind, {
    onNone: () => Option.none(),
    onSome: (kind) =>
      Option.some({
        declarationList,
        kind
      })
  })
}

const mutableVariableDeclarationKind = (
  sourceFile: ts.SourceFile,
  declarationList: ts.VariableDeclarationList
): Option.Option<MutableVariableDeclarationKind> => {
  const firstToken = declarationList.getFirstToken(sourceFile)

  return Option.match(Option.fromNullable(firstToken), {
    onNone: () => Option.none(),
    onSome: (firstToken) => {
      switch (firstToken.kind) {
        case ts.SyntaxKind.LetKeyword:
          return Option.some("let")
        case ts.SyntaxKind.VarKeyword:
          return Option.some("var")
        default:
          return Option.none()
      }
    }
  })
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

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
