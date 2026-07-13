class ConfigLoader {
  read(): { path: string } {
    return { path: "/tmp/config" }
  }
}

export const loadConfig = (): { path: string } => {
  const loader = new ConfigLoader()
  return loader.read()
}
