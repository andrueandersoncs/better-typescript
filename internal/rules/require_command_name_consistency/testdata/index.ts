interface Effect<A, E = never> {
  readonly success: A
  readonly failure: E
}
declare const succeed: <A>(value: A) => Effect<A>
declare function sendRaw(message: string): void

const saveUser = (): string => "user"
const saveRecord = (): void => undefined
declare function parseValue(): string
const sendMessage = (message: string) => succeed(sendRaw(message))
const publishEvent = (message: string) => {
  sendRaw(message)
}
const writeLog = async (message: string) => {
  sendRaw(message)
}
const saveAccount = (): Effect<string> => succeed("account")
const getUser = () => {
  sendRaw("user")
}
