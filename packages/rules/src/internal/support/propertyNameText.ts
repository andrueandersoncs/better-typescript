import * as ts from "typescript"
import { Match as EffectMatch, pipe } from "effect"
import { stringLiteralLikeText } from "./stringLiteralLikeText.js"
import { optionNodeText } from "./optionNodeText.js"
import { constantNoneString } from "./constantNoneString.js"

export const computedPropertyStringText = (computed: ts.ComputedPropertyName) =>
  stringLiteralLikeText(computed.expression)

export const propertyNameText = (name: ts.PropertyName) =>
  pipe(
    EffectMatch.value(name),
    EffectMatch.when(ts.isIdentifier, optionNodeText),
    EffectMatch.when(ts.isStringLiteralLike, optionNodeText),
    EffectMatch.when(ts.isNumericLiteral, optionNodeText),
    EffectMatch.when(ts.isComputedPropertyName, computedPropertyStringText),
    EffectMatch.orElse(constantNoneString)
  )
