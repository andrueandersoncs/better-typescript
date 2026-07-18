interface User {
  readonly id: string
  readonly name: string
}

interface Message {
  readonly body: string
}

declare let writtenName: string
declare let publishedId: string
declare let selectedId: string
declare let loadedName: string

// False command claims: command verbs without void/command evidence.
export const saveUser = (user: User): User => ({ // ~detect 14
  id: user.id,
  name: user.name.trim()
})

export const sendMessage = (message: Message): string => message.body // ~detect 14

export const publishEvent = (user: User): { readonly id: string } => ({ // ~detect 14
  id: user.id
})

export const writeConfig = (user: User): number => user.name.length // ~detect 14

// Hidden commands: void bodies named like accessors, projections, or bare results.
export const userName = (user: User): void => { // ~detect 14
  writtenName = user.name
}

export const getUser = (user: User): void => { // ~detect 14
  selectedId = user.id
}

export const selectedUser = (user: User): void => { // ~detect 14
  selectedId = user.id
}

export const loadUser = (user: User): void => { // ~detect 14
  loadedName = user.name
}

export const findUser = (user: User): void => { // ~detect 14
  selectedId = user.id
}

export const createUser = (user: User): void => { // ~detect 14
  publishedId = user.id
}

export function resolvedUser(user: User): void { // ~detect 17
  writtenName = user.name
}

export class UserStore {
  userName(user: User): void { // ~detect 3
    writtenName = user.name
  }

  saveUser(user: User): User { // ~detect 3
    return { id: user.id, name: user.name.trim() }
  }
}
