import type * as ts from "typescript"

export const compactTypeText = (type: ts.TypeNode) => type.getText().replace(/\s+/g, " ").trim()
