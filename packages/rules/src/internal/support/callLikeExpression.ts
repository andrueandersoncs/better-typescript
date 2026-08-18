import * as ts from "typescript"

// CallLikeExpression is the shared call/construct shape because both consume arguments alike.
export type CallLikeExpression = ts.CallExpression | ts.NewExpression
