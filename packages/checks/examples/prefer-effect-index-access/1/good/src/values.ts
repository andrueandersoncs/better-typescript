import { Array, Tuple } from "effect"

const values = [1, 2, 3]
const index = 1
const value = Array.get(values, index)
const pair: [number, string] = [1, "one"]
const label = Tuple.get(pair, 1)

void value
void label
