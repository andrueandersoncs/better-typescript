export type Profile = {
  readonly id: string
  readonly displayName: string
}

export class ProfileStore {
  public readonly tableName = "customer_profiles"

  public saveProfile(profile: Profile): Profile {
    return profile
  }

  public findProfile(id: string): Profile | undefined {
    return undefined
  }
}
