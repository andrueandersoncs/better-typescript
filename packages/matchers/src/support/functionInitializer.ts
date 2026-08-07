import * as ts from "typescript"

// FunctionInitializer is the shared function shape because owners must agree.
export type FunctionInitializer = ts.ArrowFunction | ts.FunctionExpression
