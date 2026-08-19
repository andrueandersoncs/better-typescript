import { Array } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

const responseJsonNames = Array.of("json")

export const callIsResponseJson = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)

  return (
    ts.isPropertyAccessExpression(callee) && Array.contains(responseJsonNames, callee.name.text)
  )
}

export const schemaDecodeNames = Array.make(
  "decodeUnknown",
  "decodeUnknownEffect",
  "decodeUnknownSync",
  "decodeUnknownOption",
  "decodeUnknownEither",
  "decodeUnknownResult",
  "decodeUnknownExit",
  "decodeUnknownPromise",
  "decode",
  "decodeEffect",
  "decodeSync",
  "decodeOption",
  "decodeEither",
  "decodeResult",
  "decodeExit",
  "decodePromise"
)
