declare const a: boolean, b: boolean, c: boolean
const violation = a && b || c
const clean = a && b
void violation
void clean
