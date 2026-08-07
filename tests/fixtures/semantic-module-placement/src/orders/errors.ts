export class OrderParseError {
  readonly _tag = "OrderParseError" as const

  constructor(readonly message: string) {}
}
