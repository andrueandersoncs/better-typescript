import { Schema } from "effect"

interface Named {
  readonly name: string
}

export class DomainError extends Error {
  readonly domain = "domain"
}

export class Person extends Schema.Class<Person>("Person")({
  name: Schema.String
}) {}

export class NamedError extends Error implements Named {
  readonly name = "NamedError"
}

export const Anonymous = class extends Error {
  readonly value = 0
}
