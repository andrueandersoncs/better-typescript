declare const isEven: (n: number) => boolean

export const parityLabel = (n: number): string => (isEven(n) ? "even" : "odd")
