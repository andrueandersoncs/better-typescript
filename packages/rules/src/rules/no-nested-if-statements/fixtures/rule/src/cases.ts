export function blockThenNesting(a: boolean, b: boolean): number {
  if (a) {
    if (b) { // ~detect 5
      return 1
    }
  }
  return 0
}

export function bracelessThenNesting(a: boolean, b: boolean): number {
  if (a) if (b) return 1 // ~detect 10
  return 0
}

export function tripleThenNest(a: boolean, b: boolean, c: boolean): number {
  if (a) {
    if (b) { // ~detect 5
      if (c) { // ~detect 7
        return 1
      }
    }
  }
  return 0
}
