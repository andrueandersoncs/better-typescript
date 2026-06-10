import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "prefer-implicit-return"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

export const preferImplicitReturn: Rule = {
  id: ruleId,
  description: "Prefer implicit arrow function returns over block bodies with a single return.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isArrowFunction),
        Stream.filter(hasSingleValueReturnStatement),
        Stream.map((arrowFunction) =>
          createRuleMatch(context, {
            ruleId,
            node: arrowFunction.body,
            message: "Avoid arrow function block bodies that only return a value.",
            hint:
              "Replace this with an implicit return by removing the return statement and function " +
              "body braces. Wrap object literals in parentheses when needed."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const hasSingleValueReturnStatement = (
  arrowFunction: ts.ArrowFunction
): arrowFunction is ArrowFunctionWithBlockBody => {
  if (ts.isBlock(arrowFunction.body)) {
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]
    const hasSingleReturn = hasOneStatement && isValueReturnStatement(firstStatement)

    return hasSingleReturn
  }

  return false
}

const isValueReturnStatement = (statement: ts.Statement): boolean =>
  ts.isReturnStatement(statement)
    ? Option.isSome(Option.fromNullable(statement.expression))
    : false
