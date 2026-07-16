import { chooseMode, chooseRegion } from "./domain/configuration.js"

export const mode = chooseMode(true)
export const region = chooseRegion("eu-west")
