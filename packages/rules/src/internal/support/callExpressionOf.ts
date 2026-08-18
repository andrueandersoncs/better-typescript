import * as ts from "typescript"
import { Option } from "effect"

export const callExpressionOf = Option.liftPredicate(ts.isCallExpression)
