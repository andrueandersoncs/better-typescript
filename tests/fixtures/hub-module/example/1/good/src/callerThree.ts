import { readMid } from "./reading.js"
import { writeTail } from "./writing.js"

export const three = (): string => readMid() + writeTail()
