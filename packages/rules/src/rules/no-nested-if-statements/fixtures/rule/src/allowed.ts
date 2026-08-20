export function elseIfChain(a: boolean, b: boolean, c: boolean): number {
  if (a) {
    return 1
  } else if (b) {
    return 2
  } else {
    return 3
  }
}

export function ifInsideElseBlock(a: boolean, b: boolean): number {
  if (a) {
    return 1
  } else {
    if (b) {
      return 2
    }
  }
  return 0
}

export function siblingIfs(a: boolean, b: boolean): number {
  if (a) {
    return 1
  }
  if (b) {
    return 2
  }
  return 0
}

export function scopeBoundary(a: boolean, b: boolean): number {
  if (a) {
    const f = (): number => {
      if (b) {
        return 2
      }
      return 0
    }
    return f()
  }
  return 0
}
