import * as ts from "typescript"
import { Array, Match, Option, Struct, pipe } from "effect"
import { constantNoneString } from "../../support/constantNoneString.js"
import { optionNodeText } from "../../support/optionNodeText.js"

const bindingNameText = (name: ts.BindingName) =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, optionNodeText),
    Match.orElse(constantNoneString)
  )

export const signalParameterName = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    Array.head(callback.parameters),
    Option.map(Struct.get("name")),
    Option.flatMap(bindingNameText)
  )
