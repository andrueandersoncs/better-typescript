import { Schema } from "effect"

export class Container {
  readonly items: ReadonlyArray<number> = []
}

export class DomainError extends Error {
  readonly domain = "domain"
}

export class Person extends Schema.Class<Person>("Person")({
  name: Schema.String
}) {}

export const Anonymous = class {
  readonly value = 0
}

export interface ShapeContract {
  readonly area: () => number
}

const abstract = "not a modifier"

export const describeAbstract = (): string => abstract
