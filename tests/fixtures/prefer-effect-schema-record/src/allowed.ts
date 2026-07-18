import { Schema } from "effect"

// 1. Boundary-only interface — used as param/return type, never constructed
export interface ApiResponse {
  readonly status: number
}
export const readStatus = (response: ApiResponse): number => response.status

// 2. Boundary-only type alias — used as param/return type, never constructed
export type Settings = { readonly verbose: boolean }
export const readSettings = (settings: Settings): boolean => settings.verbose

// 3. Schema record with decoded interface
export const Money = Schema.Struct({
  amount: Schema.Number
})
export interface Money extends Schema.Schema.Type<typeof Money> {}
export const price = Money.make({ amount: 10 })

// 4. Interface whose values come from outside — boundary type, never constructed
export interface ExternalConfig {
  readonly url: string
}
export const useConfig = (config: ExternalConfig): string => config.url
