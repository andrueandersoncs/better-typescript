import type { CalculateTotalInput } from "./data.js"

const calculateTotal = (input: CalculateTotalInput): number =>
  input.values.reduce((total, value) => total + value, 0)

void calculateTotal
