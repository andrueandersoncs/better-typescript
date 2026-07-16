import { usedByApp } from "@fixture/lib/util"
import { helper } from "./helper.js"

export const run = (value: number): number => usedByApp(helper(value))
