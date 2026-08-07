import * as ts from "typescript"
import type { CallLikeExpression } from "./callLikeExpression.js"
import { Array } from "effect"

export const callArguments = (call: CallLikeExpression): ReadonlyArray<ts.Expression> =>
  call.arguments ?? Array.empty()
