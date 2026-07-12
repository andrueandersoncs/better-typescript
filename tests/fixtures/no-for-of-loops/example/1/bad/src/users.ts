declare const users: ReadonlyArray<{ readonly name: string }>

export const names: Array<string> = []

for (const user of users) {
  names.push(user.name)
}
