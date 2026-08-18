import type * as ts from "typescript"

// ReferenceKey uses compiler declarations because raw TypeScript objects have no stable equality.
export type ReferenceKey<_Symbol extends ts.Symbol = ts.Symbol> = string
