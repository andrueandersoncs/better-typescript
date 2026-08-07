import * as ts from "typescript"
import { Option, pipe } from "effect"

export const signatureDeclarationOption = (
  signature: ts.Signature
): Option.Option<ts.Declaration> => pipe(signature.getDeclaration(), Option.fromNullishOr)
