declare const f: (x: number) => (y: string) => string
declare const fixed: string
export const flipped = (x: number) => f(x)(fixed)
