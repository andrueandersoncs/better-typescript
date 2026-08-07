import { Option, pipe } from "effect"
import * as ts from "typescript"

export const ancestorMatching =
  (predicate: (node: ts.Node) => boolean) =>
  (node: ts.Node): Option.Option<ts.Node> => {
    const visit = (current: ts.Node): Option.Option<ts.Node> => {
      const matched = Option.liftPredicate(predicate)(current)
      const atSourceFile = ts.isSourceFile(current.parent)

      return pipe(
        matched,
        Option.orElse(() => (atSourceFile ? Option.none() : visit(current.parent)))
      )
    }

    return visit(node.parent)
  }
