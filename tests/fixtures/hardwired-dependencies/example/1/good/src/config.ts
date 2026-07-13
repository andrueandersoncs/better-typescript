export class ConfigLoader {
  read(): { path: string } {
    return { path: "/tmp/config" }
  }
}

export const loadConfig = (loader: ConfigLoader): { path: string } => loader.read()
