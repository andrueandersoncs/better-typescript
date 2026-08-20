export {}

// Only two guards: ordinary early returns, not a dispatch ladder.
function clamp(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

// Three guards, but each inspects a different subject — argument validation, not a single-value match.
function validate(name: string, age: number, email: string): string {
  if (name.length === 0) return "name required"
  if (age < 0) return "age invalid"
  if (email.length === 0) return "email required"
  return "ok"
}

// A chain whose branches do not all exit the scope is not a flat dispatch ladder.
function accumulate(node: string): number {
  let total = 0
  if (node === "a") {
    total = total + 1
  }
  if (node === "b") {
    total = total + 2
  }
  if (node === "c") {
    total = total + 3
  }
  return total
}

// Guards with else branches are handled by other rules, not this one.
function describe(node: string): string {
  if (node === "x") {
    return "ex"
  } else if (node === "y") {
    return "why"
  } else {
    return "other"
  }
}
