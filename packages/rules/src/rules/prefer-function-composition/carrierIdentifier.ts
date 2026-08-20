import { Option, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTowerCarrier } from "./unwrapTowerCarrier.js"

export const carrierIdentifier = (expression: ts.Expression) =>
  pipe(expression, unwrapTowerCarrier, Option.some, Option.filter(ts.isIdentifier))
