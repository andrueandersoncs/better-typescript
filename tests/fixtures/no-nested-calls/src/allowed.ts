export {}

// Currying helper: makeAdder returns a function (callable), so the currying
// exemption applies when makeAdder(1) is passed as an argument to applyFn.
function makeAdder(x: number): (y: number) => number {
  return (y: number): number => x + y
}
function applyFn(fn: (n: number) => number, n: number): number {
  return fn(n)
}

function inner(): number {
  return 42
}
function outer(x: number): number {
  return x * 2
}

// Currying exemption: inner call returns a function, so no match
const currying = applyFn(makeAdder(1), 2)

// Callee position: makeAdder(1) is the callee of the outer call, not an argument
const calleePos = makeAdder(1)(2)

// Receiver position: inner() is the receiver of `.toString()`, not an argument
const receiverPos: string = inner().toString()

// Inner result bound to a const first — no nesting at all
const bound = inner()
const result = outer(bound)

// Simple non-call argument — no nesting
const simple = outer(42)
