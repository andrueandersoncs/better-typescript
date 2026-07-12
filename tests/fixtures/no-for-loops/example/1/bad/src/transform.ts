declare const items: ReadonlyArray<number>

export const doubled: Array<number> = []

for (let i = 0; i < items.length; i++) {
  doubled.push(items[i] * 2)
}
