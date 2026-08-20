export {}

// Arrow as a call argument
declare const arr: Array<number>
void arr.map((x: number) => x) // ~detect 26

// Arrow as an object-property value
const o = { run: (x: number) => x } // ~detect 30

// Arrow as an array element
const fns = [(x: number) => x] // ~detect 26

// Returned from a function via return
function make(): (n: number) => number {
  return (n: number) => n // ~detect 22
}

// Conditional branch (both branches are unsanctioned arrows)
declare const cond: boolean
const g = cond ? (a: number) => a : (b: number) => b // ~detect 30,49
