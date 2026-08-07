import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"

export const nestedSingleParamArrow = (arrow: ts.ArrowFunction) =>
  strictEqual(1)(arrow.parameters.length)
