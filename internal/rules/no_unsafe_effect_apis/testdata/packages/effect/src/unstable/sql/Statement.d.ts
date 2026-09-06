export interface Constructor {
  unsafe(sql: string, params?: ReadonlyArray<unknown>): unknown
  literal(sql: string): unknown
}

export function unsafe(sql: string): unknown
