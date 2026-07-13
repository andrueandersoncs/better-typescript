import { charge } from "./billing/index.js"

export const pay = (): string => charge()
