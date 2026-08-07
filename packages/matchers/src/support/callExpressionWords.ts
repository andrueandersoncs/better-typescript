import * as ts from "typescript"
import { calleeWords } from "./calleeWords.js"

export const callExpressionWords = (call: ts.CallExpression) => calleeWords(call.expression)
