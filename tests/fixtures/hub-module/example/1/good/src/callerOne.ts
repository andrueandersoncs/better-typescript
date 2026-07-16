import { readFront, summarizeFront } from "./reading.js"

export const one = (): string => readFront() + summarizeFront()
