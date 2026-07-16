import { Array } from "effect"

const values = [1, 2, 3]
const allPositive = Array.every(values, (n) => n > 0)
