import { Option, pipe } from "effect"

import * as ts from "typescript"

import { propertyNameText } from "../../support/propertyNameText.js"

export const declarationNameText = (declaration: ts.NamedDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.filter(ts.isPropertyName),
    Option.flatMap(propertyNameText)
  )
