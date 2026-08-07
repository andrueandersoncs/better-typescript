import { Option } from "effect"

import * as ts from "typescript"

export const callArgumentAt = (index: number) => (call: ts.CallExpression) =>
  Option.fromNullishOr(call.arguments[index])
