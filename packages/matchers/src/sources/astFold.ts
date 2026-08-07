import * as ts from "typescript"

export type AstFold<A> = (accumulator: A, node: ts.Node) => A
