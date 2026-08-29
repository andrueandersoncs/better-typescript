import type { ErrorData } from "../types"
export class FirstError extends Error { readonly data!: ErrorData }
