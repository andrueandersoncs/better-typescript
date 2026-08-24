interface User { name: string }
const findUser = (): User => ({ name: "bad" })
const findOptionalUser = (): User | undefined => undefined
