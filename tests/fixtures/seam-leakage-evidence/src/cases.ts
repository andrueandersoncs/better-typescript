import { secret } from "./billing/internal/secret.js"

export const charge = (): string => secret
