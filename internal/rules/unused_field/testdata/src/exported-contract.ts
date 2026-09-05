export interface Definition {
  readonly initial: number
  readonly update: (state: number) => number
}

export const define = (definition: Definition): Definition => definition
