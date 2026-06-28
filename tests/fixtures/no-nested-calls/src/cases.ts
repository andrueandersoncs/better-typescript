export {}

// All inner callees have explicit NON-callable return types so the type-checker
// does not apply the currying exemption.

function inner(): number {
  return 42
}
function wrap(x: number): number {
  return x + 1
}
function outer(x: number): number {
  return x * 2
}
function collect(arr: number[]): number {
  return arr[0] ?? 0
}
function build(obj: { value: number }): number {
  return obj.value
}
function register(s: Service): number {
  return 0
}

class Service {
  id = 1
}

// Direct nesting: inner() is consumed as an argument of outer()
const direct = outer(inner())

// Deep chain: outer(wrap(inner())) — 2 matches (wrap consumed by outer,
// inner consumed by wrap). Pre-order DFS: wrap reported before inner.
const chain = outer(wrap(inner()))

// Forwarded through arithmetic (BinaryExpression)
const arithmetic = outer(inner() + 1)

// Forwarded through an array literal
const arrayLit = collect([inner()])

// Forwarded through an object literal (via PropertyAssignment)
const objLit = build({ value: inner() })

// Forwarded through as (AsExpression)
const asExpr = outer(inner() as number)

// NewExpression as inner: callText = "new Service", consumerText = "register"
const newInner = register(new Service())

// NewExpression as consumer: callText = "inner", consumerText = "new Outer"
class Outer {
  constructor(x: number) {
    void x
  }
}
const newConsumer = new Outer(inner())
