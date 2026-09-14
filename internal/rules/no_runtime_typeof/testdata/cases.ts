declare const input: unknown
if (typeof input === "string") console.log(input)
const missing = typeof document === "undefined"
void missing
const parenthesizedMissing = (typeof document) === ("undefined")
void parenthesizedMissing
