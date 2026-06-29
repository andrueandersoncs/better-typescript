export {}

const items = ["a", "b"]
const extra = ["c", "d"]
const flag = true

const unconditionalSpread = [
  ...items,
  ...extra
]

const conditionalOutsideSpread = flag ? items : []

const bothBranchesPopulated = [
  ...(flag ? items : extra)
]

const bothBranchesEmpty = [
  ...(flag ? [] : [])
]

const spreadInFunctionCall = Math.max(...items.map(Number))

void unconditionalSpread
void conditionalOutsideSpread
void bothBranchesPopulated
void bothBranchesEmpty
void spreadInFunctionCall
