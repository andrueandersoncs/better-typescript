import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { isDispatchGuard } from "./isDispatchGuard.js"

export const siblingDispatchGuard =
  (offset: number) =>
  (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
    pipe(
      Option.liftPredicate(ts.isBlock)(ifStatement.parent),
      Option.flatMap((block) => {
        const isCurrentIfStatement = strictEqual(ifStatement)
        const statementAtOffset = (index: number) => Option.fromNullishOr(block.statements[index])

        return pipe(
          Array.findFirstIndex(block.statements, isCurrentIfStatement),
          Option.map((index) => index + offset),
          Option.flatMap(statementAtOffset),
          Option.filter(isDispatchGuard)
        )
      })
    )
