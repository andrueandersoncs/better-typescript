import { Array } from "effect"
import { endsWithSuffix } from "./endsWithSuffix.js"

export const ambiguousEndingSuffixes = Array.make("ss", "us", "is", "ics")

export const hasAmbiguousEnding = (word: string) =>
  Array.some(ambiguousEndingSuffixes, endsWithSuffix(word))
