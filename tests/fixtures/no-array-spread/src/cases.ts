export {}

const left: ReadonlyArray<string> = ["a", "b"]
const right: ReadonlyArray<string> = ["c", "d"]
const item = "x"

const combined = [...left, ...right] // ~detect 19,28

const withTail = [...left, item] // ~detect 19

const withHead = [item, ...left] // ~detect 25

const surrounded = [item, ...left, item] // ~detect 27

const singleSpread = [...left] // ~detect 23

const parenthesizedSpread = [...(left as ReadonlyArray<string>)] // ~detect 30

void combined
void withTail
void withHead
void surrounded
void singleSpread
void parenthesizedSpread
