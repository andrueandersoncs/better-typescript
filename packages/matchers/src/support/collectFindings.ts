import { Array, pipe } from "effect"

export type FindingCollector<Context, Index, Node, Finding> = (
  context: Context,
  index: Index,
  node: Node
) => ReadonlyArray<Finding>

export const collectFindings =
  <Context, Index, Node, Finding>(
    collectors: ReadonlyArray<FindingCollector<Context, Index, Node, Finding>>
  ) =>
  (context: Context, index: Index, node: Node): ReadonlyArray<Finding> =>
    pipe(
      collectors,
      Array.flatMap((collector) => collector(context, index, node))
    )
