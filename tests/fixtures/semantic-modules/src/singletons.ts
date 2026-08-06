export function parse(value: string) {
  return value
}

export class Box {
  readonly value = "box"
}

export interface Named {
  readonly name: string
}

export type Identifier = string
