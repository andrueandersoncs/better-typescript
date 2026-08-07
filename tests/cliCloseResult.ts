export interface CloseResult {
  readonly status: number | null
  readonly signal: NodeJS.Signals | null
}
