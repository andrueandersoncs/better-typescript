export {}

export interface Animal {
  speak(): string
}

class Base {
  readonly render = (): string => "base"
}

export class Cat extends Base {
  override render = (): string => "meow"
}

export class Box {
  constructor(readonly value: number) {}

  get current(): number {
    return this.value
  }

  readonly read = (): number => this.value
}
