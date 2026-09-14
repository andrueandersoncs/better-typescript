const source = { id: "second" }
const widened: unknown = source
const parsed = widened as { readonly id: string }
declare const boundary: unknown
const decoded = boundary as { readonly id: string }
void parsed
void decoded
const assertedStored = { id: "asserted" } as unknown
const assertedUser = assertedStored as { readonly id: string }
function restore(source: { readonly id: string }) {
  const stored: unknown = source
  return stored as { readonly id: string }
}
const alreadyBroad: unknown = {}
const storedBroad: unknown = alreadyBroad
const notRestored = storedBroad as { readonly id: string }
const broadRecord: Record<string, unknown> = { one: 1 }
const narrowedRecord = broadRecord as Record<string, number>
const finiteRecord: Record<"one", number> = { one: 1 }
const finiteAssertion = finiteRecord as { readonly one: number }
const regexStored: unknown = /known/
const regexRestored = regexStored as RegExp
void assertedUser
void restore
void notRestored
void narrowedRecord
void finiteAssertion
void regexRestored
const annotatedAsserted: unknown = { id: "both" } as unknown
const annotatedRestored = annotatedAsserted as { readonly id: string }
const readonlyStored: Readonly<{ [key: string]: unknown }> = { one: 1 }
const readonlyRestored = readonlyStored as { readonly one: number }
void annotatedRestored
void readonlyRestored
