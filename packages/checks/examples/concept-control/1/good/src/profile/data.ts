/**
 * Profile is the stable identity shared by presentation and policy decisions.
 *
 * @remarks
 *   Exists because presentation and policy evolve independently. Removing it
 *   would duplicate the same identity and field contract across both owners.
 * @modelRole shared
 */
export interface Profile {
  readonly displayName: string
  readonly active: boolean
}
