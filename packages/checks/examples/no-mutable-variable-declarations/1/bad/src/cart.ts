declare const items: ReadonlyArray<{ readonly price: number }>

export let total = 0

for (const item of items) {
  total += item.price
}
