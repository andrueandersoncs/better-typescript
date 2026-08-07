import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

export const accessNameIsPipe = (access: ts.PropertyAccessExpression) =>
  strictEqual("pipe")(access.name.text)
