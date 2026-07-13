export const loadConfig = (): { path: string } => {
  const loader = new ConfigLoader()
  return loader.read()
}

class ConfigLoader {
  read(): { path: string } {
    return { path: "/tmp/config" }
  }
}
