import { Option, pipe } from "effect"

import * as ts from "typescript"

import { enclosingFunctionName } from "./enclosingFunctionName.js"

export const isInsideNamedCallback = (pattern: RegExp) => (node: ts.Node) =>
  pipe(
    enclosingFunctionName(node),
    Option.exists((name) => pattern.test(name))
  )
