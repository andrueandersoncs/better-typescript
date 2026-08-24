declare const f: (x: number, y: number) => number
export const wrapped = (x: number) => f(x, 1)
