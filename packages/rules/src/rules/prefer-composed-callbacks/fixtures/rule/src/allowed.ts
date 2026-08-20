export {}

type Item = { readonly id: string; readonly seen: boolean }
type Output = { readonly value: string }

declare const values: ReadonlyArray<string>
declare const items: ReadonlyArray<Item>
declare const suffix: string
declare const collect: <A, B>(
  values: ReadonlyArray<A>,
  project: (value: A) => B
) => ReadonlyArray<B>
declare const resolve: (id: string) => string
declare const combine: (id: string, suffix: string) => Output
declare const listen: (callback: (item: Item) => void) => void
export const unaryForward = collect(values, (value) => resolve(value))

export const objectTransform = collect(items, (item) => ({ ...item, seen: true }))

const namedAdapter = (item: Item) => combine(item.id, suffix)

export const namedCallback = collect(items, namedAdapter)

listen((item) => {
  console.log(item.id)
})
