import { Array } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { mutuallyAssignable } from "./mutuallyAssignable.js"
import { sameSensitiveFlags } from "./sameSensitiveFlags.js"

const signaturesEquivalent = (
  checker: ts.TypeChecker,
  leftNode: ts.Node,
  rightNode: ts.Node,
  left: ts.Signature,
  right: ts.Signature
) => {
  const leftParameters = left.getParameters()
  const rightParameters = right.getParameters()
  const parameterPairs = Array.zip(leftParameters, rightParameters)

  const parametersMatch = Array.every(parameterPairs, ([leftParameter, rightParameter]) => {
    const leftType = checker.getTypeOfSymbolAtLocation(leftParameter, leftNode)
    const rightType = checker.getTypeOfSymbolAtLocation(rightParameter, rightNode)
    const sameFlags = sameSensitiveFlags(leftType, rightType)
    const assignable = mutuallyAssignable(checker, leftType, rightType)
    const parameterFlags = Array.make(sameFlags, assignable)

    return Array.every(parameterFlags, Boolean)
  })

  const leftReturn = checker.getReturnTypeOfSignature(left)
  const rightReturn = checker.getReturnTypeOfSignature(right)
  const sameReturnFlags = sameSensitiveFlags(leftReturn, rightReturn)
  const assignableReturns = mutuallyAssignable(checker, leftReturn, rightReturn)
  const returnFlags = Array.make(sameReturnFlags, assignableReturns)
  const returnsMatch = Array.every(returnFlags, Boolean)
  const sameParameterCount = strictEqual(rightParameters.length)(leftParameters.length)
  const signatureFlags = Array.make(sameParameterCount, parametersMatch, returnsMatch)

  return Array.every(signatureFlags, Boolean)
}

const typeText = (checker: ts.TypeChecker, type: ts.Type, node: ts.Node) =>
  checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
      ts.TypeFormatFlags.WriteArrowStyleSignature
  )

export const typesEquivalent = (
  checker: ts.TypeChecker,
  leftNode: ts.Node,
  rightNode: ts.Node,
  left: ts.Type,
  right: ts.Type
) => {
  const leftSignatures = left.getCallSignatures()
  const rightSignatures = right.getCallSignatures()
  const signaturePairs = Array.zip(leftSignatures, rightSignatures)

  const signaturesMatch = Array.every(signaturePairs, ([leftSignature, rightSignature]) =>
    signaturesEquivalent(checker, leftNode, rightNode, leftSignature, rightSignature)
  )

  const leftText = typeText(checker, left, leftNode)
  const rightText = typeText(checker, right, rightNode)
  const sameFlags = sameSensitiveFlags(left, right)
  const assignable = mutuallyAssignable(checker, left, right)
  const sameSignatureCount = strictEqual(rightSignatures.length)(leftSignatures.length)
  const sameText = strictEqual(rightText)(leftText)

  const equivalenceFlags = Array.make(
    sameFlags,
    assignable,
    sameSignatureCount,
    signaturesMatch,
    sameText
  )

  return Array.every(equivalenceFlags, Boolean)
}
