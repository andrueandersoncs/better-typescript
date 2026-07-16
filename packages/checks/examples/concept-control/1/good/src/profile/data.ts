// Profile is the stable identity because presentation and policy read one shared contract.
export interface Profile {
  readonly displayName: string
  readonly active: boolean
}
