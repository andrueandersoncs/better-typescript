declare const maybe: string | undefined
const violation = maybe!
const clean = maybe ?? "fallback"
void violation
void clean
