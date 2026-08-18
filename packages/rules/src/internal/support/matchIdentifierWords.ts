import { constantEmptyStrings } from "./constantEmptyStrings.js"
import { Array, Function, Option } from "effect"

export const identifierWordPattern = /[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/gu

export const matchIdentifierWords = (text: string) => text.match(identifierWordPattern)

export const lowercaseWord = (word: string) => word.toLowerCase()

export const lowercaseWords = Array.map(lowercaseWord)

export const identifierWords: (text: string) => ReadonlyArray<string> = Function.flow(
  matchIdentifierWords,
  Option.fromNullishOr,
  Option.map(lowercaseWords),
  Option.getOrElse(constantEmptyStrings)
)
