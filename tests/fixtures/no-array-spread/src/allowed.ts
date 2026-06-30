export {}

const numbers: ReadonlyArray<number> = [1, 2, 3]
const head = "first"

const callSpread = Math.max(...numbers.map(Number))

const literalOnly: ReadonlyArray<string> = ["a", "b", "c"]

const emptyLiteral: ReadonlyArray<string> = []

const elementByElement: ReadonlyArray<string> = [head, "tail"]

void callSpread
void literalOnly
void emptyLiteral
void elementByElement
