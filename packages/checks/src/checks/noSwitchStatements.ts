import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const switchStatementKind = ts.SyntaxKind.SwitchStatement

const switchStatementElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.SwitchStatement): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid switch statements.",
      hint:
        "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
        "so every case is handled explicitly."
    })
  ]

  return matches
}

export const noSwitchStatements: Check = nodeCheck([switchStatementKind])(
  ts.isSwitchStatement
)(switchStatementElements)

export const noSwitchStatementsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-switch-statements")
