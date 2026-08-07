import * as ts from "typescript"

export const isExpressionBody = (body: ts.ConciseBody): body is ts.Expression => !ts.isBlock(body)
