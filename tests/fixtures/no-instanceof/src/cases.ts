// Case 1: instanceof with a first-party class extending Error
class AppError extends Error {}

const value: unknown = new AppError()

export const isAppError = value instanceof AppError

// Case 2: instanceof with a first-party standalone class
class Config {
  readonly host: string = "localhost"
}

export const isConfig = value instanceof Config
