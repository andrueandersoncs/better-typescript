import { Array, Tuple } from "effect"
import type * as ts from "typescript"

export const makePathWithMember =
  (memberName: string) => (path: readonly [ts.Identifier, ReadonlyArray<string>]) => {
    const root = Tuple.get(path, 0)
    const existing = Tuple.get(path, 1)
    const members = Array.append(existing, memberName)

    return Tuple.make(root, members)
  }
