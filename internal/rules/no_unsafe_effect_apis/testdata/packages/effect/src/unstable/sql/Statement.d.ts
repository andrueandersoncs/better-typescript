export interface Constructor {
  readonly unsafe: <A extends object>(
    sql: string,
    params?: ReadonlyArray<unknown> | undefined
  ) => A
  readonly literal: (sql: string) => unknown
}

export function unsafe(sql: string): unknown
