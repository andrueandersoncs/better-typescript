import { Equivalence } from "effect"

const numberEqual = Equivalence.strictEqual<number>()

void numberEqual
