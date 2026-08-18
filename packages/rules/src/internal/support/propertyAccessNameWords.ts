import * as ts from "typescript"
import { identifierWords } from "./matchIdentifierWords.js"

export const propertyAccessNameWords = (access: ts.PropertyAccessExpression) =>
  identifierWords(access.name.text)
