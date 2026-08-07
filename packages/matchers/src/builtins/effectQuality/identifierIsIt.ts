import { Option, pipe } from "effect"

import * as ts from "typescript"

import { identifierTextIsIt } from "./identifierTextIsIt.js"

export const identifierIsIt = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsIt))
