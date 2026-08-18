import * as ts from "typescript"
import { constantEmptyStrings } from "./constantEmptyStrings.js"
import { identifierWords } from "./matchIdentifierWords.js"
import { propertyAccessNameWords } from "./propertyAccessNameWords.js"
import { unwrapCarrier } from "./unwrapCarrier.js"
import { Function, pipe, Match as EffectMatch } from "effect"

export const identifierWordsFromText = (identifier: ts.Identifier) =>
  identifierWords(identifier.text)

export const directCalleeWords = (callee: ts.Expression) =>
  pipe(
    EffectMatch.value(callee),
    EffectMatch.when(ts.isIdentifier, identifierWordsFromText),
    EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessNameWords),
    EffectMatch.orElse(constantEmptyStrings)
  )

export const calleeWords = Function.compose(unwrapCarrier, directCalleeWords)
