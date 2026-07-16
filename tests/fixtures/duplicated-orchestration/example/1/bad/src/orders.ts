const derive = (value: string): string => value.trim()

const concat = (left: string, right: string): string => `${left}:${right}`

const finalize = (value: string): string => value.toUpperCase()

export const mergeOrders = (left: string, right: string): string =>
  finalize(concat(derive(left), right))
