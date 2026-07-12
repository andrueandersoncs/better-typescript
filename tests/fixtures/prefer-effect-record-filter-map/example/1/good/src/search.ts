import { Option, Record } from "effect"

declare const params: {
  readonly query: string | null
  readonly page: number | null
}

export const queryParameters = Record.filterMap(
  {
    query: params.query,
    page: params.page
  },
  Option.fromNullable
)
