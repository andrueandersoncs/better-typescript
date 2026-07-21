export {}

type Item = { readonly id: string }
type Output = { readonly text: string }

declare const items: ReadonlyArray<Item>
declare const suffix: string
declare const collect: <A, B>(
  values: ReadonlyArray<A>,
  project: (value: A) => B
) => ReadonlyArray<B>
declare const format: (id: string, suffix: string) => Output

const formatItem = (item: Item) => format(item.id, suffix)

export const formatted = collect(items, formatItem)
