import { Option, Predicate, pipe } from "effect"
import { strictEqual } from "../../internal/equivalence.js"
import * as ts from "typescript"
import { hasExportModifier } from "../../internal/support/hasExportModifier.js"

export const isTopLevelExportedDeclaration = (node: ts.Node) => {
  const visitParent = (current: ts.Node): boolean =>
    pipe(
      Option.fromNullishOr(current.parent),
      Option.filter(Predicate.not(ts.isSourceFile)),
      Option.exists(visit)
    )

  const statementIsTopLevel = (statement: ts.Statement) =>
    strictEqual(ts.SyntaxKind.SourceFile)(statement.parent.kind)

  const visit = (current: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(ts.isStatement)(current),
      Option.filter(statementIsTopLevel),
      Option.match({
        onNone: () => visitParent(current),
        onSome: hasExportModifier
      })
    )

  return visit(node)
}
