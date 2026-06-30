export {}

const left: ReadonlyArray<string> = ["a", "b"]
const right: ReadonlyArray<string> = ["c", "d"]
const item = "x"

const combined = [...left, ...right]

const withTail = [...left, item]

const withHead = [item, ...left]

const surrounded = [item, ...left, item]

const singleSpread = [...left]

const parenthesizedSpread = [...(left as ReadonlyArray<string>)]

void combined
void withTail
void withHead
void surrounded
void singleSpread
void parenthesizedSpread
