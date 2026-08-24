interface User { name: string }
const isUser = (): User => ({ name: "bad" })
const isReady = (): boolean => true
declare function parseValue(): string
