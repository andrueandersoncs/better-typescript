const a = 1
const b = 2
const c = 3
class D {}
const e = 5

function statements(flag: boolean) {
  let value = 1
  console.log(value)
  value = 2
  if (flag) console.log(value)
  return value
}

const commented = 1
// A comment alone is not an empty line.
class Commented {}

const sameLine = 1; class SameLine {}

export const exported = 1
export class Exported {}
