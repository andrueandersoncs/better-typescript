import { Equivalence as Equal } from "effect"

const stringEqual = Equal.strictEqual<string>()
const booleanEqual = Equal.strictEqual<boolean>()
