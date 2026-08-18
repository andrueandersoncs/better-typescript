import * as ts from "typescript"

export const mutuallyAssignable =
  (checker: ts.TypeChecker) => (left: ts.Type) => (right: ts.Type) =>
    checker.isTypeAssignableTo(left, right) && checker.isTypeAssignableTo(right, left)
