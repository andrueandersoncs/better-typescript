import { Array } from "effect"
import * as ts from "typescript"
import {
  hasAnyReturnType,
  isReturnTypeDeclaration,
  returnTypeDeclarationKinds
} from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"

const explicitAnyReturnElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => {
    const reported = element({
      node,
      message: "Avoid function return types that include any.",
      hint:
        "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
        "use unknown and narrow before use."
    })

    return isReturnTypeDeclaration(node) && hasAnyReturnType(node)
      ? Array.of(reported)
      : Array.empty()
  }

  return matches
}

export const noExplicitAnyReturn = defineCheck(
  "no-explicit-any-return",
  returnTypeDeclarationKinds,
  isReturnTypeDeclaration,
  explicitAnyReturnElements
)
