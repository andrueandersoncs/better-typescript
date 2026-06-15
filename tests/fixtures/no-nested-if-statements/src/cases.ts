export function blockThenNesting(a: boolean, b: boolean): number {
  if (a) {
    if (b) {
      return 1
    }
  }
  return 0
}

export function bracelessThenNesting(a: boolean, b: boolean): number {
  if (a)
    if (b)
      return 1
  return 0
}

export function tripleThenNest(a: boolean, b: boolean, c: boolean): number {
  if (a) {
    if (b) {
      if (c) {
        return 1
      }
    }
  }
  return 0
}
