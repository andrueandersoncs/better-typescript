export {}

const items = ["a", "b"]
const extra = ["c", "d"]
const flag = true

const emptyInFalseBranch = [
  ...(flag ? items : []),
  ...extra
]

const emptyInTrueBranch = [
  ...(flag ? [] : items),
  ...extra
]

const parenthesizedConditional = [
  ...((flag ? items : [])),
  ...extra
]

const nonLiteralTrueBranch = [
  ...(flag ? items.concat(extra) : []),
  ...extra
]

void emptyInFalseBranch
void emptyInTrueBranch
void parenthesizedConditional
void nonLiteralTrueBranch
