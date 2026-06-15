import { Effect } from "effect"

export const increment = (n: number): number => n + 1

export const fetchUser = (id: number) => Effect.succeed(id)

export function describe(value: number): string {
  return `value is ${value}`
}

export class Box {
  private contents = 0

  constructor(initial: number) {
    this.contents = initial
  }

  get current(): number {
    return this.contents
  }

  set current(next: number) {
    this.contents = next
  }

  read(): number {
    return this.contents
  }
}
