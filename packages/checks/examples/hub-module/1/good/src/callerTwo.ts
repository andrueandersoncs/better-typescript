import { writeBack, summarizeBack } from "./writing.js"

export const two = (): string => writeBack() + summarizeBack()
