import * as ts from "typescript"

export const isDifferentType = (type: ts.Type) => (other: ts.Type) => other !== type
