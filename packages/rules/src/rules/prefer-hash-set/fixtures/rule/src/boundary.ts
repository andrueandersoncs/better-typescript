export {}

// Escapes via a variable later passed to a default-lib call
const payload = new Set(["a"])
const body = JSON.stringify(payload)

// Escapes as a direct argument to a default-lib call
const inline = JSON.stringify(new Set(["a"]))

// Ambient type reference mirrors an external contract
declare const loadFlags: () => Set<string>

// Control: construction only used locally still reports
const local = new Set<number>() // ~detect 15
const v = local.has(1)

// Control: non-ambient written type still reports
const annotated: Set<number> = local // ~detect 18
