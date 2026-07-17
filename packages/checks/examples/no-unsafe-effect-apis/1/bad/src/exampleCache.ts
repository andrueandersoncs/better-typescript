import { HashMap, Ref } from "effect"

const emptyExamples = HashMap.empty<string, ReadonlyArray<string>>()

export const loadedExamples = Ref.makeUnsafe(emptyExamples)
