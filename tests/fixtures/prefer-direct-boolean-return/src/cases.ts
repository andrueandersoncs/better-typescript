export {}

function returnTrue(n: number): boolean {
  if (n > 0) {
    return true
  }
  return false
}

function returnFalse(size: number): boolean {
  if (size > 0) {
    return false
  }
  return true
}

function ifElseBooleanThen(ready: boolean, override: boolean): boolean {
  if (ready) {
    return true
  } else {
    return override
  }
}

function parenthesizedTrue(n: number): boolean {
  if (n % 2 === 1) {
    return true
  }
  return false
}

function bracelessTrue(n: number): boolean {
  if (n === 0) return true
  return false
}

function ternaryTrueFalse(n: number): boolean {
  return n > 0 ? true : false
}

function ternaryFalseTrue(size: number): boolean {
  return size > 0 ? false : true
}

function ternaryValueElseFalse(flag: boolean, value: boolean): boolean {
  return flag ? value : false
}

function ternaryFalseThenValue(flag: boolean, value: boolean): boolean {
  return flag ? false : value
}
