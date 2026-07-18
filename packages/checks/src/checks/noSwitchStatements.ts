import { pipe, Array } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
const switchStatementKind = ts.SyntaxKind.SwitchStatement

const switchStatementElements = (context: CheckContext) => {
  const element = makeDetection(context)

  const matches = (node: ts.SwitchStatement): ReadonlyArray<Detection> =>
    pipe(
      {
        node,
        message: "Avoid switch statements.",
        hint:
          "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
          "so every case is handled explicitly."
      },
      element,
      Array.of
    )

  return matches
}

const switchStatementKinds = Array.of(switchStatementKind)

export const noSwitchStatements = makeCheck(
  "no-switch-statements",
  switchStatementKinds,
  ts.isSwitchStatement,
  switchStatementElements
)
