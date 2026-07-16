export {}

// Escapes via a variable later passed to a default-lib call
const payload = new Map([["a", "1"]])
const body = JSON.stringify(payload)

// Escapes as a direct argument to a default-lib call
const inline = JSON.stringify(new Map([["a", "1"]]))

// Ambient type reference mirrors an external contract
declare const loadHeaders: () => Map<string, string>

// Control: construction only used locally still reports
const local = new Map<string, number>() // ~detect 15
const v = local.get("a")

// Control: non-ambient written type still reports
const annotated: Map<string, number> = local // ~detect 18
