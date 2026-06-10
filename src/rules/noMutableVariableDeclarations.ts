import { Chunk, Effect, Match, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext } from "./types.js"

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
        Stream.map((match) =>
          createRuleMatch(context, {
            ruleId,
            node: match.declarationList,
            message: `Avoid declaring mutable variables with ${match.kind}.`,
            hint:
              "Declare multiple const values to represent each state instead of mutating a single " +
              "variable, and use immutable values that are not reassigned."
          })
        ),
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
    onSome: (firstToken) =>
      Match.value(firstToken.kind).pipe(
        Match.when(ts.SyntaxKind.LetKeyword, () => "let" as const),
        Match.when(ts.SyntaxKind.VarKeyword, () => "var" as const),
        Match.option
      )
  })
}
