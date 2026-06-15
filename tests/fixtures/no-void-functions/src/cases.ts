let total = 0
let lastMessage = ""

export const logMessage = (message: string): void => {
  lastMessage = message
}

export function resetTotal(): void {
  total = 0
}

export const addToTotal = (amount: number) => {
  total = total + amount
}

export const noop = function (): void {}

export class Counter {
  private value = 0

  increment(): void {
    this.value = this.value + 1
  }
}
