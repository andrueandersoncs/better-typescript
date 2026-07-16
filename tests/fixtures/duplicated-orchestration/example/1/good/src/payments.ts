import { merge } from "./merge.js"

export const mergePayments = (left: string, right: string): string => merge(left, right)
