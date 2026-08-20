import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"

const sensitiveTypeFlags = ts.TypeFlags.Any | ts.TypeFlags.Never | ts.TypeFlags.Unknown

export const sameSensitiveFlags = (left: ts.Type) => (right: ts.Type) =>
  strictEqual(right.flags & sensitiveTypeFlags)(left.flags & sensitiveTypeFlags)
