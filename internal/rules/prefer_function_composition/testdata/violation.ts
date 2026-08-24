declare const step: (x: number) => number
export const composed = (value: number) => {
 const next = value + 1
 return step(next)
}
