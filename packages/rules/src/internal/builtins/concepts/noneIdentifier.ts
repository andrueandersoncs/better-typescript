import { Option } from "effect"
import type * as ts from "typescript"

export const noneIdentifier: Option.Option<ts.Identifier> = Option.none()
