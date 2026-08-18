import { Struct } from "effect"
import type * as ts from "typescript"

export const identifierText = Struct.get<ts.Identifier, "text">("text")
