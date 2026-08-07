import * as ts from "typescript"
import { argumentConsumingCall } from "./argumentConsumingCall.js"
import { resolvedCallSignature } from "./resolvedCallSignature.js"
import { signatureDeclarationIsExternal } from "./signatureDeclarationIsExternal.js"
import { signatureDeclarationOption } from "./signatureDeclarationOption.js"
import { Option, pipe } from "effect"

// Missing declarations do not grant escape because exemptions need a proven external boundary.
export const hasExternalDeclaration = (signature: ts.Signature) =>
  pipe(signatureDeclarationOption(signature), Option.exists(signatureDeclarationIsExternal))

export const isExternalArgumentPosition = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    argumentConsumingCall(node),
    Option.flatMap(resolvedCallSignature(checker)),
    Option.exists(hasExternalDeclaration)
  )
