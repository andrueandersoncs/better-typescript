import { formatDate } from "../dateFormat.js"

export const createdLabel = (createdAt: Date): string => formatDate(createdAt)
