import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import { unwrapExpression } from "./tsNode.js"
import type { Rule } from "./types.js"

const ruleId = "no-inline-boolean-expressions"

export const noInlineBooleanExpressions: Rule = {
  id: ruleId,
  description: "Disallow boolean operators inline in an if statement condition.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.map((ifStatement) => unwrapExpression(ifStatement.expression)),
        Stream.filter(isLogicalOperatorExpression),
        Stream.map((expression) =>
          createRuleMatch(context, {
            ruleId,
            node: expression,
            message: "Avoid boolean operators inline in an if statement condition.",
            hint:
              "Extract the expression into a well-named const variable declaration above the if " +
              "statement and use that variable in the if condition."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isLogicalOperatorExpression = (expression: ts.Expression): boolean =>
  Option.match(Option.liftPredicate(ts.isBinaryExpression)(expression), {
    onNone: () => false,
    onSome: (expression) => logicalOperatorKinds.has(expression.operatorToken.kind)
  })

const logicalOperatorKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken
])
