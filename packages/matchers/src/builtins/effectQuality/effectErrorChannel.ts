import { Array, Function, Option, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { typeIsNever } from "./typeIsNever.js"

import { typeSymbolName } from "./typeSymbolName.js"

const effectErrorChannel =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(expression)

    const fromReference = (candidate: ts.Type): Option.Option<ts.Type> => {
      const symbolName = typeSymbolName(candidate)
      const isEffectName = strictEqual("Effect")(symbolName)
      const isStreamName = strictEqual("Stream")(symbolName)
      const isEffectFamily = isEffectName || isStreamName
      const isObject = (candidate.flags & ts.TypeFlags.Object) !== 0
      const objectFlags = (candidate as ts.TypeReference).objectFlags ?? 0
      const isTypeReferenceFlag = (objectFlags & ts.ObjectFlags.Reference) !== 0
      const isInterfaceFlag = (objectFlags & ts.ObjectFlags.Interface) !== 0
      const referenceShapeFlags = Array.make(isTypeReferenceFlag, isInterfaceFlag)
      const isReferenceShape = Array.some(referenceShapeFlags, Boolean)
      const typeReferenceFlags = Array.make(isObject, isReferenceShape)
      const isTypeReference = Array.every(typeReferenceFlags, Boolean)
      const isEffectReference = Array.make(isEffectFamily, isTypeReference)

      if (Array.every(isEffectReference, Boolean)) {
        const typeArguments = checker.getTypeArguments(candidate as ts.TypeReference)

        return Array.get(typeArguments, 1)
      }

      if (candidate.isUnion()) {
        return pipe(
          candidate.types,
          Array.map(fromReference),
          Array.findFirst(Option.isSome),
          Option.flatten
        )
      }

      const rendered = checker.typeToString(candidate)
      const effectMatch = rendered.match(/(?:Effect|Stream)<\s*[^,>]+,\s*([^,>]+)/)

      return pipe(
        Option.fromNullishOr(effectMatch),
        Option.flatMap(Array.get(1)),
        Option.filter((text) => text.trim() !== "never"),
        Option.map(Function.constant(candidate))
      )
    }

    return fromReference(type)
  }

const typeIsNonNever = flow(typeIsNever, strictEqual(false))

const typeIsNonNeverError = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const isNever = typeIsNever(type)
  const isNonNever = strictEqual(false)(isNever)

  if (type.isUnion()) {
    const nonNever = Array.filter(type.types, typeIsNonNever)

    return nonNever.length > 0
  }

  const rendered = checker.typeToString(type).trim()
  const renderedNonNever = rendered !== "never"
  const flags = Array.make(isNonNever, renderedNonNever)

  return Array.every(flags, Boolean)
}

export const typedErrorFromSelf =
  (checker: ts.TypeChecker) =>
  (self: ts.Expression): Option.Option<ts.Type> =>
    pipe(effectErrorChannel(checker)(self), Option.filter(typeIsNonNeverError(checker)))
