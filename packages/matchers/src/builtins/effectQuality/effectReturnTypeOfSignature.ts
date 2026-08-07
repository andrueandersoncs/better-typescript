import * as ts from "typescript"

export const effectReturnTypeOfSignature = (checker: ts.TypeChecker) => (signature: ts.Signature) =>
  checker.getReturnTypeOfSignature(signature)
