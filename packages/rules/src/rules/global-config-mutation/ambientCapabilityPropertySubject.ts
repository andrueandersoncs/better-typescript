import { Array, Option, flow, pipe } from "effect"
import { strictEqual } from "../../internal/equivalence.js"
import * as ts from "typescript"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { ambientPathAt } from "../../internal/support/effectApi/ambientPath.js"

const pathTextEquals2 = flow(Array.join("."), strictEqual("process.env"))

export const ambientCapabilityPropertySubject =
  (context: MatchContext) => (node: ts.PropertyAccessExpression) =>
    pipe(
      ambientPathAt(context.checker)(node),
      Option.filter(pathTextEquals2),
      Option.map(Array.join("."))
    )
