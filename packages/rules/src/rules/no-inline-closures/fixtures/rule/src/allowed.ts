export {}

// Named const initializer (sanctioned)
const id = (x: number): number => x

// Curried arrow (arrow returning arrow, both sanctioned)
const add =
  (x: number) =>
  (y: number): number =>
    x + y

// Parenthesized initializer (transparent wrapper → sanctioned)
const p = (x: number): number => x

// satisfies-wrapped const arrow (transparent wrapper → sanctioned)
const q = ((x: number) => x) satisfies (n: number) => number
