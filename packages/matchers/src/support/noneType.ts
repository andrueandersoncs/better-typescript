import * as ts from "typescript"
import { Option } from "effect"

export const noneType = Option.none<ts.Type>()
