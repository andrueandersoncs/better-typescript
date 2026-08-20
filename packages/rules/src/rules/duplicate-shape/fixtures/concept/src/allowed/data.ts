// SharedProfile is the stable identity because presentation and policy read one contract.
export interface SharedProfile {
  readonly profileDisplayName: string
  readonly profileIsActive: boolean
}
