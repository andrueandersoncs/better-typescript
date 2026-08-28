export {}

const Object = {
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
void [Object.keys(value), Object.entries(value), Object.values(value), Object.fromEntries([]), Object.hasOwn(value, "a"), Object.assign({}, value), Object.is(value, value), Object.groupBy([value], () => "value")]
