function classify(value: string): string {
 if (value === "a") return "a"
 if (value === "b") return "b"
 if (value === "c") return "c"
 return "other"
}
function clamp(value: number): number {
 if (value < 0) return 0
 if (value > 10) return 10
 return value
}
void classify
void clamp
