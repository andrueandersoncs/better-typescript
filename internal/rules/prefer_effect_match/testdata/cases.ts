declare const kind: string
const invalid = kind === "a" ? "A" : kind === "b" ? "B" : "Other"
const allowed = kind === "a" ? "A" : "Other"
void invalid
void allowed
declare const flag: boolean | null
const booleanInvalid = flag === true ? "yes" : flag === false ? "no" : "unset"
void booleanInvalid
