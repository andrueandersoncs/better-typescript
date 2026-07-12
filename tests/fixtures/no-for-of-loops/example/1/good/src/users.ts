import { Array, Struct } from "effect"

declare const users: ReadonlyArray<{ readonly name: string }>

export const names = Array.map(users, Struct.get("name"))
