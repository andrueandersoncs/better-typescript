export const fail = (): never => {
  throw new Error("failed")
}

export type Failure = Error
