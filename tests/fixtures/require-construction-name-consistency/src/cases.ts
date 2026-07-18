interface User {
  readonly id: string
  readonly name: string
}

interface Profile {
  readonly label: string
}

declare const users: ReadonlyArray<User>
declare const profiles: ReadonlyArray<Profile>

// Factory vocabulary on lookup/projection of existing data.
export const makeUser = (id: string): User => users.find((user) => user.id === id)! // ~detect 14

export const createUser = (id: string): User => users.find((user) => user.id === id)! // ~detect 14

export const buildProfile = (label: string): Profile => // ~detect 14
  profiles.find((profile) => profile.label === label)!

export const constructUser = (id: string): User => // ~detect 14
  users.find((user) => user.id === id)!

// Constructs a value without construction vocabulary (result noun agrees or is absent).
export const user = (name: string): User => ({ // ~detect 14
  id: name,
  name
})

export const profile = (label: string): Profile => ({ // ~detect 14
  label
})

export function userFromName(name: string): User { // ~detect 17
  return {
    id: name,
    name
  }
}

export class UserFactory {
  user(name: string): User { // ~detect 3
    return {
      id: name,
      name
    }
  }

  makeUser(id: string): User { // ~detect 3
    return users.find((user) => user.id === id)!
  }
}
