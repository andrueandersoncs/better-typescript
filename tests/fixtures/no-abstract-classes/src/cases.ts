export {}

abstract class Shape {
  abstract area(): number
}

export abstract class Repository {
  readonly name = "repository"
}

abstract class BaseError extends Error {
  readonly kind = "base"
}

export function makeHandler() {
  abstract class Handler {
    abstract handle(): number
  }

  return Handler
}
