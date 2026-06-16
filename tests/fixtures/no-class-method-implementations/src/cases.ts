export {}

export class Calculator {
  add(left: number, right: number): number {
    return left + right
  }
}

export class Greeter {
  greet(name: string): string {
    return `hello ${name}`
  }

  private prefix(): string {
    return ">>"
  }
}

export class Counter {
  count = 0

  static zero(): number {
    return 0
  }
}
