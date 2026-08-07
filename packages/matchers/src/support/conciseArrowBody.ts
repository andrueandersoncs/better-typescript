import * as ts from "typescript"
import { Option } from "effect"

export const conciseArrowBody = (arrowFunction: ts.ArrowFunction): Option.Option<ts.Expression> =>
  ts.isBlock(arrowFunction.body) ? Option.none() : Option.some(arrowFunction.body)
