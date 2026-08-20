declare module "@effect/vitest" {
  export const it: {
    (name: string, test: () => unknown): void
    effect(name: string, test: () => unknown): void
    live(name: string, test: () => unknown): void
  }
}
