export {}
type Readonly<T> = { readonly value: T }
const item: Readonly<unknown> = { value: 1 }
void item
