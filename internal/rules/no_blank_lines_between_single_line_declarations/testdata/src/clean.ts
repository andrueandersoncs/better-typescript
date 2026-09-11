export function value(): number {
  const left = 1
  const right = 2
  return left + right
}

export function separatedKinds(): number {
  const before = 1

  class Local {}

  const after = 2
  return before + after
}
