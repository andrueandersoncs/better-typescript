import { Array, Option, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "../../matcher/matchContext.js"
import { ambientPathAt } from "./ambientPath.js"

const pathTextEquals2 = flow(Array.join("."), strictEqual("process.env"))

export const ambientCapabilityPropertySubject = (
  context: MatchContext,
  node: ts.PropertyAccessExpression
) =>
  pipe(
    ambientPathAt(context.checker, node),
    Option.filter(pathTextEquals2),
    Option.map(Array.join("."))
  )
