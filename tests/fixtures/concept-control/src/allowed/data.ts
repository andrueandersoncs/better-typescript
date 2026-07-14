/**
 * SharedProfile is the stable identity consumed by profile presentation and access policy.
 *
 * @modelRole shared
 * @remarks Exists because the presentation and policy owners evolve independently. Removing it would reconstruct the same stable identity and field contract in both owners.
 */
export interface SharedProfile {
  readonly profileDisplayName: string
  readonly profileIsActive: boolean
}
