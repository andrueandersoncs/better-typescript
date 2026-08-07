import { Wiring } from "@better-typescript/core/engine/wiring/wiringClass"
import { configFor } from "./reportConfigFor.js"
import { reportTexts } from "./reportTexts.js"

export const reportFromTestWiring = (wiring: Wiring) => reportTexts(configFor(wiring))
