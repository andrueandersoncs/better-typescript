export const selected = (): never => {
  throw new Error("selected")
}

export type SelectedFailure = Error
