type Profile = {
  id: string
  displayName: string
}

interface ProfileReader {
  getProfile(id: string): Promise<Profile>
}

class ProfileApi implements ProfileReader {
  async getProfile(id: string): Promise<Profile> {
    return api.get(`/profiles/${id}`)
  }
}

export class ProfileService {
  constructor(private readonly reader: ProfileReader) {}

  async load(id: string) {
    return this.reader.getProfile(id)
  }
}

export function createProfileService() {
  return new ProfileService(new ProfileApi())
}

declare const api: { get(path: string): Promise<Profile> }
