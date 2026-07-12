import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const abstractKeywordKind = ts.SyntaxKind.AbstractKeyword

const isAbstractClassModifier = (node: ts.Node): node is ts.Node =>
  ts.isClassDeclaration(node.parent)

const abstractClassElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.Node): ReadonlyArray<Detection> => [
    element({
      node,
      message: "Avoid declaring classes as abstract.",
      hint:
        "Declaring an abstract class in first-party code implies object-oriented programming, which is not allowed. To share " +
        "functionality, extract it into reusable functions and export those functions." +
        " To model a union of types, use a type union instead of an abstract class."
    })
  ]

  return matches
}

export const noAbstractClasses: Check = nodeCheck([abstractKeywordKind])(
  isAbstractClassModifier
)(abstractClassElements)

export const noAbstractClassesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-abstract-classes")
