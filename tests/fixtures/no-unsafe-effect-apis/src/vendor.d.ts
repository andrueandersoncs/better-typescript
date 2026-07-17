declare module "@acme/unsafe-kit" {
  export function makeUnsafe(value: number): number
  export function unsafeParse(text: string): unknown
}
