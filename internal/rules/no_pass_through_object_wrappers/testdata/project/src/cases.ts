interface Fields { filePath: string; code: string }
declare const Factory: { make: (fields: Fields) => Fields }
const violation = (filePath: string, code: string) => Factory.make({ filePath, code })
interface Value { value: number }
declare const ValueFactory: { make: (fields: Value) => Value }
const fromNumber = (value: number) => ValueFactory.make({ value })
const clean = (filePath: string, code: string) => Factory.make({ filePath: filePath.trim(), code })
void violation
void clean
