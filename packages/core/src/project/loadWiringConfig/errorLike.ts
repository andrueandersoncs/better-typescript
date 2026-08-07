// ErrorLike is a message-bearing failure because loaders normalize thrown values.
export class ErrorLike {
  constructor(readonly message: string) {}
}
