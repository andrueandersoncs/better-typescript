// First-party pipe method: not effect's Pipeable#pipe, must not fire
interface Chainable {
  pipe(next: string): Chainable
}

declare const chain: Chainable

export const chained = chain.pipe("next")
