import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { emptyTypes } from "./emptyTypes.js"
import { hasWord } from "./hasWord.js"
import { isNamedCarrierType } from "./isNamedCarrierType.js"
import { keyedWords } from "./keyedWords.js"
import { nestedTypes } from "./nestedTypes.js"
import { nullishFlags } from "./nullishFlags.js"
import { objectTypeReferenceArguments } from "./typeArgumentsOfReference.js"
import { typeResultWords } from "./typeResultWords.js"
import { Array, Option } from "effect"

export const carrierPayload = (checker: ts.TypeChecker) => {
  const children = nestedTypes(checker)

  const payloadFromType = (type: ts.Type) => {
    const words = typeResultWords(type)
    const isCarrier = isNamedCarrierType(type)
    const aliasArguments = type.aliasTypeArguments ?? emptyTypes
    const referenceArguments = objectTypeReferenceArguments(checker)(type)
    const explicitArguments = Array.appendAll(aliasArguments, referenceArguments)
    const nested = children(type)
    const isNonNullishType = (candidate: ts.Type) => strictEqual(0)(candidate.flags & nullishFlags)
    const withoutNullish = Array.filter(nested, isNonNullishType)

    const fallbackCandidates = Array.isReadonlyArrayNonEmpty(withoutNullish)
      ? withoutNullish
      : nested

    const candidates = Array.isReadonlyArrayNonEmpty(explicitArguments)
      ? explicitArguments
      : fallbackCandidates

    const keyed = hasWord(words)(keyedWords)
    const selected = keyed ? Array.last(candidates) : Array.head(candidates)

    return isCarrier ? selected : Option.some(type)
  }

  return payloadFromType
}
