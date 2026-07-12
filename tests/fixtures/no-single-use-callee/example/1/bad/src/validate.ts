const isPositive = (n: number): boolean =>
  n > 0

const validateAge = (age: number): boolean =>
  isPositive(age) // isPositive is only called here
