const a = 1
let b = 2
var c = 3
export const d = 4

class D {}
class E {}

function expressions() {
  console.log(a)
  b = 4

  return b
}

function separated() {
  const value = 1

  // Keep the explanation attached to the class.
  class Local {}

  return value
}

const multiline = [
  1,
]
class AfterMultiline {}

class BeforeMultiline {}
const anotherMultiline = [
  2,
]

class Members {
  value = 1
  method() { return this.value }
}

const object = {
  value: 1,
  method() { return this.value },
}

function branch(flag: boolean) {
  if (flag) return 1
  else return 2
}
