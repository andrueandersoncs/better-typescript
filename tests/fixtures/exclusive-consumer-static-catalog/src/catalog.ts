export const firstEntry = () => "first"
export const secondEntry = () => "second"

export const entryCatalog = {
  firstEntry,
  secondEntry
} as const

export class EntryCatalog {
  static readonly entries = [firstEntry, secondEntry] as const
}
