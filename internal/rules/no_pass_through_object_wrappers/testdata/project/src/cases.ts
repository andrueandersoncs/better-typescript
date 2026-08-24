interface Fields { filePath: string; code: string }
declare const Factory: { make: (fields: Fields) => Fields }
const violation = (filePath: string, code: string) => Factory.make({ filePath, code })
const clean = (filePath: string, code: string) => Factory.make({ filePath: filePath.trim(), code })
void violation
void clean
