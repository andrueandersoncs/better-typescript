export {}

const lookup = new Map<string, number>()

const weak = new WeakSet<object>()

class CustomSet<T> {}
const custom = new CustomSet<string>()

const numbers = [1, 2, 3]
const mapped = numbers.map((n: number) => n + 1)
