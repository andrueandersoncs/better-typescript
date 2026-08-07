import * as ts from "typescript"

// ReturnedExpressionNode is the return/arrow contract because both checks need one vocabulary.
export type ReturnedExpressionNode = ts.ReturnStatement | ts.ArrowFunction
