import type * as ts from "typescript"
import type { ReturnTypeDeclaration } from "../support/returnTypeDeclaration.js"

// RawObjectTarget is a local syntax union because matchers need one narrowed node shape.
export type RawObjectTarget = ts.ParameterDeclaration | ReturnTypeDeclaration
