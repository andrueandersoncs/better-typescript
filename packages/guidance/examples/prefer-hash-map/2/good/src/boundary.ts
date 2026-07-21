import { HashMap } from "effect"

declare const loadHeaders: () => Map<string, string>

const headers = loadHeaders()

export const lookup = HashMap.fromIterable(headers)
