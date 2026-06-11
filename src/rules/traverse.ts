import * as ts from "typescript"

// ts.forEachChild is the fast child enumerator (AST children only, no tokens), but it
// is callback-shaped; the Map accumulator turns it into a value without array mutation.
// The callback must return undefined, not the Map, or forEachChild would stop early.
const recordChild = (children: Map<number, ts.Node>) => (child: ts.Node): void => {
  children.set(children.size, child)
}

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = new Map<number, ts.Node>()

  ts.forEachChild(node, recordChild(children))

  return [...children.values()]
}
