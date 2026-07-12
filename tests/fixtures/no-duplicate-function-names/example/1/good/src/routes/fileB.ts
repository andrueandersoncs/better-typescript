import { formatDate } from "../dateFormat.js"

export const updatedLabel = (updatedAt: Date): string => formatDate(updatedAt)
