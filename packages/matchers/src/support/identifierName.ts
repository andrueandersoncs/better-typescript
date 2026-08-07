import * as ts from "typescript"
import { Option } from "effect"

export const identifierName = Option.liftPredicate(ts.isIdentifier)
