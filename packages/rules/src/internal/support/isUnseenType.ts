import * as ts from "typescript"
import { isDifferentType } from "./isDifferentType.js"
import type { SeenTypes } from "./seenTypes.js"
import { Array } from "effect"

export const isUnseenType =
  (seen: SeenTypes) =>
  (type: ts.Type): boolean =>
    Array.every(seen, isDifferentType(type))
