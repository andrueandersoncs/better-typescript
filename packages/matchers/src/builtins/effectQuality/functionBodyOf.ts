import { Option } from "effect"

import * as ts from "typescript"

export const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)
