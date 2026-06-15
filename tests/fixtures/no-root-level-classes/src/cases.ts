export {}

interface Named {
  readonly name: string
}

export class Container {
  readonly items: ReadonlyArray<number> = []
}

export class Person implements Named {
  readonly name = "anonymous"
}

export function makeWidget() {
  class Widget {
    readonly id = 0
  }

  return new Widget()
}

export const Anonymous = class {
  readonly value = 0
}
