export {}

function returnTrue(n: number): boolean {
  if (n > 0) { // ~detect 3
    return true
  }
  return false
}

function returnFalse(size: number): boolean {
  if (size > 0) { // ~detect 3
    return false
  }
  return true
}

function ifElseBooleanThen(ready: boolean, override: boolean): boolean {
  if (ready) { // ~detect 3
    return true
  } else {
    return override
  }
}

function parenthesizedTrue(n: number): boolean {
  if (n % 2 === 1) { // ~detect 3
    return true
  }
  return false
}

function bracelessTrue(n: number): boolean {
  if (n === 0) return true // ~detect 3
  return false
}

function ternaryTrueFalse(n: number): boolean {
  return n > 0 ? true : false // ~detect 10
}

function ternaryFalseTrue(size: number): boolean {
  return size > 0 ? false : true // ~detect 10
}

function ternaryValueElseFalse(flag: boolean, value: boolean): boolean {
  return flag ? value : false // ~detect 10
}

function ternaryFalseThenValue(flag: boolean, value: boolean): boolean {
  return flag ? false : value // ~detect 10
}
