let total = 0
let lastMessage = ""

export const logMessage = (message: string): void => { // ~detect 27
  lastMessage = message
}

export function resetTotal(): void { // ~detect 17
  total = 0
}

export const addToTotal = (amount: number) => { // ~detect 27
  total = total + amount
}

export const noop = function (): void {} // ~detect 21

export class Counter {
  private value = 0

  increment(): void { // ~detect 3
    this.value = this.value + 1
  }
}
