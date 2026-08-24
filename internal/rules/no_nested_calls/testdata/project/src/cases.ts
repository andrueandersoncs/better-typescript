function inner(): number { return 1 }
function outer(value: number): number { return value }
const violation = outer(inner())
const value = inner()
const clean = outer(value)
void violation
void clean
