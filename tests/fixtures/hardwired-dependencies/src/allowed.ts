import { Schema } from "effect"

export class ConfigLoader {
  read(): { path: string } {
    return { path: "/tmp/config" }
  }
}

export const loadConfig = (loader: ConfigLoader): { path: string } => loader.read()

class LocalConfig extends Schema.Class<LocalConfig>("LocalConfig")({
  path: Schema.String
}) {}

export const makeLocalConfig = (): LocalConfig =>
  new LocalConfig({ path: "/tmp/config" })
