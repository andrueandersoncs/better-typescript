import { op1, op2, op3, op4 } from "./hub.js"

export const one = (): string => op1() + op2() + op3() + op4()
