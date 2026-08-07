import { flow, Option, pipe, Struct } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

const identifierTextIsMap = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Map"))

const isMapIdentifier = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsMap))

const newExpressionIsMap = (expression: ts.NewExpression) => isMapIdentifier(expression.expression)

export const newMapExpression = (node: ts.Node) =>
  pipe(Option.liftPredicate(ts.isNewExpression)(node), Option.filter(newExpressionIsMap))
