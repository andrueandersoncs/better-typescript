export function declaration(value: number): number {
  const before = 0
  const values = [
    value,
  ]

  return before + values[0]
}

export function expression(value: number): number {
  const before = value

  Math.max(
    before,
  )
  return before
}

export function loop(values: ReadonlyArray<number>): number {
  let total = 0
  for (const value of values) {
    total += value
  }

  return total
}

export function conditional(value: boolean): number {
  const before = 1

  if (value) {
    return before
  }
  return 0
}

export function clean(value: boolean, values: ReadonlyArray<number>): void {
  const first = 1
  const second = 2

  Math.max(
    first,
    second,
  )

  for (const item of values) {
    if (item > first) {
      return
    }

    void second
  }

  if (value) return
}

export function chain(value: number): number {
  if (value === 1) {
    return 1
  } else if (value === 2) {
    return 2
  } else {
    return 0
  }
}

export function leadingEmpty(): number {
  ;
  const values = [
    1,
  ]

  return values[0]
}
