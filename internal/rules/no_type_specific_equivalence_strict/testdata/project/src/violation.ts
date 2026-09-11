import { Equivalence } from "effect"
import { Equivalence as Equal } from "effect"

const sameName = Equivalence.strictEqual<string>()
const sameBoolean = Equal.strictEqual<boolean>()
