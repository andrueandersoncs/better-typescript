declare const operation: (...args: ReadonlyArray<unknown>) => unknown
declare const owner: object
declare const args: ReadonlyArray<unknown>
Reflect.apply(operation, owner, args)
function local() {
  const Reflect = { apply: () => 1 }
  Reflect.apply()
}
