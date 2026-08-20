import type * as ts from "typescript"
import type { ReturnTypeDeclaration } from "../../internal/support/returnTypeDeclaration.js"

// RawObjectTarget is a local syntax union because scanners need one narrowed node shape.
export type RawObjectTarget = ts.ParameterDeclaration | ReturnTypeDeclaration
