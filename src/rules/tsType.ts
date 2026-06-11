import { Option } from "effect"
import type * as ts from "typescript"

export const isDifferentType = (type: ts.Type) => (other: ts.Type): boolean => other !== type

export const differentBaseConstraint = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> =>
  Option.filter(Option.fromNullable(checker.getBaseConstraintOfType(type)), isDifferentType(type))

export const differentApparentType = (
  checker: ts.TypeChecker,
  type: ts.Type
): Option.Option<ts.Type> =>
  Option.filter(Option.some(checker.getApparentType(type)), isDifferentType(type))
