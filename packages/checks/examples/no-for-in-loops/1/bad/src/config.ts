declare const config: Record<string, string>

export const result: Record<string, string> = {}

for (const key in config) {
  result[key] = config[key].toUpperCase()
}
