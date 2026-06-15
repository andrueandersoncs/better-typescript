import { Schema } from "effect"

// 1. Boundary-only interface — used as param/return type, never constructed
export interface ApiResponse { readonly status: number }
export const readStatus = (response: ApiResponse): number => response.status

// 2. Type alias instead of interface — rule only visits InterfaceDeclaration
export type Settings = { readonly verbose: boolean }
export const settings: Settings = { verbose: true }

// 3. Already-correct Effect Schema class — ClassDeclaration, not an interface
export class Money extends Schema.Class<Money>("Money")({ amount: Schema.Number }) {}
export const price = new Money({ amount: 10 })

// 4. Interface whose values come from outside — boundary type, never constructed
export interface ExternalConfig { readonly url: string }
export const useConfig = (config: ExternalConfig): string => config.url
