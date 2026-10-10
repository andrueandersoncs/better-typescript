const values = [1, 2]
values.push(3)
const clean = values.map((value) => value + 1)
void clean
const cache = new Map<string, number>()
cache.set("a", 1)
cache.delete("a")
cache.clear()
const seen = new Set<string>()
seen.add("a")
const weak = new WeakMap<object, number>()
weak.set({}, 1)
const bytes = new Uint8Array(2)
bytes.fill(1)
bytes.set([1], 0)
class Registry extends Map<string, number> {}
new Registry().set("a", 1)
const reads = [cache.get("a"), seen.has("a"), bytes.slice(1), new Map(cache).size]
void reads
const custom = { set: (value: number) => value, add: (value: number) => value }
void [custom.set(1), custom.add(1)]
