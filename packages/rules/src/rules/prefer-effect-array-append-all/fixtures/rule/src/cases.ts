export {}

const items = ["a", "b"]
const extra = ["c", "d"]
const flag = true

const emptyInFalseBranch = [...(flag ? items : []), ...extra] // ~detect 29

const emptyInTrueBranch = [...(flag ? [] : items), ...extra] // ~detect 28

const parenthesizedConditional = [...(flag ? items : []), ...extra] // ~detect 35

const nonLiteralTrueBranch = [...(flag ? items.concat(extra) : []), ...extra] // ~detect 31

void emptyInFalseBranch
void emptyInTrueBranch
void parenthesizedConditional
void nonLiteralTrueBranch
