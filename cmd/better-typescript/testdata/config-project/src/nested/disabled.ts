export const disabled = (): never => {
  throw new Error("disabled")
}

export type DisabledFailure = Error
