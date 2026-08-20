export {}

const lookup = new Set<string>()

const weak = new WeakMap<object, number>()

class CustomMap<K, V> {}
const custom = new CustomMap<string, number>()

const record: Record<string, number> = { a: 1, b: 2 }
