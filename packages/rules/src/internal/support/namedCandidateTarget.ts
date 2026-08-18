import * as ts from "typescript"
import { pipe, Option, Function } from "effect"

export const namedCandidateTarget = (node: ts.NamedDeclaration): ts.Node =>
  pipe(Option.fromNullishOr(node.name), Option.getOrElse(Function.constant(node)))
