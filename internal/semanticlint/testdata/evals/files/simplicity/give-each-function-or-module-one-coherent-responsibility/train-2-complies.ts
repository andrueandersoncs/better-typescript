import { format } from "date-fns"

export const formatMoney = (cents: number, currency: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100)

export const formatShortDate = (d: Date): string => format(d, "MMM d, yyyy")

export const formatPercent = (ratio: number, digits = 1): string =>
  `${(ratio * 100).toFixed(digits)}%`

export const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
}

export const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}
