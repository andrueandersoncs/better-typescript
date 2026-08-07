import { Option } from "effect"

import * as ts from "typescript"

export const hasAncestor =
  (predicate: (candidate: ts.Node) => boolean) =>
  (node: ts.Node): boolean => {
    const visit = (current: ts.Node): boolean => {
      const matches = predicate(current)
      const parent = Option.fromNullishOr(current.parent)

      return matches || Option.exists(parent, visit)
    }

    const parent = Option.fromNullishOr(node.parent)

    return Option.exists(parent, visit)
  }
