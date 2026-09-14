declare const owner: object
declare const key: PropertyKey
Reflect.get(owner, key)
function local() {
  const Reflect = { get: () => 1 }
  Reflect.get()
}
