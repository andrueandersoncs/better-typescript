import type { ErrorData } from "../types"
export class SecondError extends Error { readonly data!: ErrorData }
