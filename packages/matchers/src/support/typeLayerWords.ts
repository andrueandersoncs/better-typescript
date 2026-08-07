import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { carrierPayload } from "./carrierPayload.js"
import { constantEmptyStrings } from "./constantEmptyStrings.js"
import { emptyStrings } from "./emptyStrings.js"
import { emptyTypes } from "./emptyTypes.js"
import { isNamedCarrierType } from "./isNamedCarrierType.js"
import { noneType } from "./noneType.js"
import { nullishFlags } from "./nullishFlags.js"
import { typeResultWords } from "./typeResultWords.js"
import { Array, flow, Struct, pipe, Option } from "effect"

export const singleNonNullishMember = (type: ts.Type) => {
  const members = type.isUnion() ? type.types : emptyTypes
  const isNonNullishType = (candidate: ts.Type) => strictEqual(0)(candidate.flags & nullishFlags)
  const nonNullish = Array.filter(members, isNonNullishType)

  const hasSingleCandidate = flow(
    Struct.get<ReadonlyArray<ts.Type>, "length">("length"),
    strictEqual(1)
  )

  return pipe(nonNullish, Option.liftPredicate(hasSingleCandidate), Option.flatMap(Array.head))
}

export const typeLayerWords =
  (checker: ts.TypeChecker) =>
  (root: ts.Type): ReadonlyArray<string> => {
    const payload = carrierPayload(checker)

    const visit =
      (remainingDepth: number) =>
      (current: ts.Type): ReadonlyArray<string> => {
        const namedCarrier = isNamedCarrierType(current)
        const words = namedCarrier ? typeResultWords(current) : emptyStrings

        if (strictEqual(0)(remainingDepth)) {
          return words
        }

        const carrierPayloadOption = namedCarrier
          ? pipe(
              payload(current),
              Option.filter((candidate) => candidate !== current)
            )
          : noneType

        const next = pipe(
          carrierPayloadOption,
          Option.orElse(() => singleNonNullishMember(current))
        )

        const nestedWords = pipe(
          next,
          Option.map(visit(remainingDepth - 1)),
          Option.getOrElse(constantEmptyStrings)
        )

        return pipe(words, Array.appendAll(nestedWords), Array.dedupe)
      }

    return visit(4)(root)
  }
