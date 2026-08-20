import { Function, Struct } from "effect"
import type * as ts from "typescript"
import { textContainsUnsafe } from "./textContainsUnsafe.js"

const symbolName = Struct.get<ts.Symbol, "name">("name")

export const nameContainsUnsafe = Function.flow(symbolName, textContainsUnsafe)
