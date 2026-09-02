interface User { name: string }
const user = (): User => ({ name: "bad" })
const makeUser = (): User => ({ name: "ok" })
declare function parseValue(): string
const make = (users: User[]): User => users[0]
