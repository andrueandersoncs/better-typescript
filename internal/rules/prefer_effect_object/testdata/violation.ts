export {}
const value = { a: 1, b: 2 }
const pairs: ReadonlyArray<readonly [PropertyKey, number]> = [["a", 1]]
const keys = Object.keys(value)
const entries = Object.entries(value)
const values = Object.values(value)
const rebuilt = Object.fromEntries(pairs)
const owns = Object.hasOwn(value, "a")
const merged = Object.assign({}, value)
const same = Object.is(value, value)
const grouped = Object.groupBy([1, 2], (item) => item % 2)
const inheritedOwn = value.hasOwnProperty("a")
const prototypeOwn = Object.prototype.hasOwnProperty.call(value, "a")
void [keys, entries, values, rebuilt, owns, merged, same, grouped, inheritedOwn, prototypeOwn]
