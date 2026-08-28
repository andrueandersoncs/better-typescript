export {}

const customObject = {
  keys: (value: object): Array<string> => [],
  entries: (value: object): Array<[string, unknown]> => [],
  values: (value: object): Array<unknown> => [],
  fromEntries: (entries: Iterable<readonly [PropertyKey, unknown]>): object => ({}),
  hasOwn: (value: object, key: PropertyKey): boolean => true,
  assign: <T extends object, U extends object>(target: T, source: U): T & U => ({ ...target, ...source }),
  is: (left: unknown, right: unknown): boolean => left === right,
  groupBy: <T>(values: Iterable<T>, key: (value: T) => PropertyKey): object => ({}),
}
const value = { a: 1 }
const keys = customObject.keys(value)
const created = Object.create(null) as object
const described = Object.getOwnPropertyDescriptor(value, "a")
class OwnValue {
  hasOwnProperty(_key: PropertyKey): boolean {
    return false
  }
}
const own = new OwnValue().hasOwnProperty("a")
const mapEntries = new Map<string, number>().entries()
const setValues = new Set<number>().values()
const arrayKeys = [1, 2].keys()
const typedArrayValues = new Uint8Array([1, 2]).values()
void [keys, created, described, own, mapEntries, setValues, arrayKeys, typedArrayValues]
