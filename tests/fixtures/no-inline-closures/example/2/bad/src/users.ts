declare const users: ReadonlyArray<{ readonly name: string }>

export const names = users.map((user) => user.name.toUpperCase())
