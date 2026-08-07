import { Option, pipe } from "effect"

import * as ts from "typescript"

export const ancestorMatching =
  <A extends ts.Node>(guard: (candidate: ts.Node) => candidate is A) =>
  (node: ts.Node): Option.Option<A> => {
    const visit = (current: ts.Node): Option.Option<A> =>
      guard(current)
        ? Option.some(current)
        : pipe(Option.fromNullishOr(current.parent), Option.flatMap(visit))

    return pipe(Option.fromNullishOr(node.parent), Option.flatMap(visit))
  }
