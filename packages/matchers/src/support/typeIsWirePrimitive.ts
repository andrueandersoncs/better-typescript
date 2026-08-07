import * as ts from "typescript"
import { typeHasAnyFlags } from "./typeHasAnyFlags.js"

export const wirePrimitiveTypeFlags =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.Null |
  ts.TypeFlags.EnumLike |
  ts.TypeFlags.Never

export const typeIsWirePrimitive = typeHasAnyFlags(wirePrimitiveTypeFlags)
