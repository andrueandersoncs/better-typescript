declare const input: unknown
const invalid = input as string
// SAFETY: This is sound because the parser validated the value.
const valid = input as string
const constant = { id: 1 } as const
void invalid
void valid
void constant
/*
 * SAFETY:
 * This is sound because the parser validated the value.
 */
const blockValid = input as string
/* SAFETY: */
const emptyBlock = input as string
const pair = [/* SAFETY: This is sound because the first value was parsed. */ input as string, input as number]
void blockValid
void emptyBlock
void pair
