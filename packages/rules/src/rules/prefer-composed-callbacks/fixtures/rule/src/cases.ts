export {}

type Item = { readonly id: string; readonly seen: boolean }
type Output = { readonly value: string }

declare const items: ReadonlyArray<Item>
declare const suffix: string
declare const collect: <A, B>(
  values: ReadonlyArray<A>,
  project: (value: A) => B
) => ReadonlyArray<B>
declare const resolve: (id: string) => string
declare const map: <A, B>(project: (value: A) => B) => (value: A) => B
declare const render: (item: Item) => (value: string) => Output
declare const combine: (id: string, suffix: string) => Output
declare const pipe: <A, B>(value: A, first: (value: A) => B) => B

export const nestedComposition = collect(items, (item) => // ~detect
  pipe(resolve(item.id), map(render(item)))
)

export const capturedCall = collect(items, (item) => // ~detect
  combine(item.id, suffix)
)
