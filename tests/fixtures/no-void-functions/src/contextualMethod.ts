export {}

interface Logger {
  log(message: string): void
}

// Method inside a contextually typed object literal: the void contract belongs
// to the Logger interface, not the author → exempt.
export const consoleLogger: Logger = {
  log(message) {
    void message
  }
}

// Control: an object literal WITHOUT a type annotation has no contextual type,
// so its void method still fires.
export const bare = {
  ping(): void {}
}
