type Profile = {
  id: string
  displayName: string
}

export class ProfileService {
  async load(id: string): Promise<Profile> {
    return api.get(`/profiles/${id}`)
  }
}

export function createProfileService() {
  return new ProfileService()
}

export async function loadCurrentProfile(id: string) {
  return new ProfileService().load(id)
}

declare const api: { get(path: string): Promise<Profile> }
