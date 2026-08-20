import { Array, Tuple } from "effect"

const values: ReadonlyArray<number> = [1, 2, 3]
const index = 1
const selected = values[index] // ~detect 18
const first = values[0] // ~detect 15

const pair: readonly [number, string] = [1, "one"]
const label = pair[1] // ~detect 15
const tuplePosition = 0
const value = pair[tuplePosition] // ~detect 15

const fromArray = Array.get(values, index)
const fromTuple = Tuple.get(pair, 1)
const record: Readonly<Record<string, number>> = { answer: 42 }
const answer = record["answer"]
const word = "answer"
const firstLetter = word[0]

void selected
void first
void label
void value
void fromArray
void fromTuple
void answer
void firstLetter
