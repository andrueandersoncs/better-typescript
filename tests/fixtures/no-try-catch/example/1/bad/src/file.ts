interface Config {
  readonly name: string
}

declare const readFile: (path: string) => string
declare const parse: (data: string) => Config
declare const defaultValue: Config

export const loadConfig = (path: string): Config => {
  try {
    const data = readFile(path)
    return parse(data)
  } catch (err) {
    return defaultValue
  }
}
