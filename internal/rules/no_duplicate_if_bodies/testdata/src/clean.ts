export function parse(value: string): void {
  if (value === "one") return
  if (value === "two") throw new Error("two")
}
