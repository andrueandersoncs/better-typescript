export {}

let counter = 0 // ~detect 1

var legacyFlag = false // ~detect 1

let first = 1, // ~detect 1
  second = 2

let pending: number // ~detect 1

for (let index = 0; index < 3; index = index + 1) { // ~detect 6
  void index
}
