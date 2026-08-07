import { Data, Option } from "effect"

// CallableNameClaims keeps one parsed name grammar because every policy consumes the same claims.
export class CallableNameClaims extends Data.Class<{
  readonly text: string
  readonly words: ReadonlyArray<string>
  readonly operation: Option.Option<string>
  readonly object: Option.Option<string>
  readonly result: Option.Option<string>
  readonly relation: Option.Option<string>
  readonly source: Option.Option<string>
}> {}
