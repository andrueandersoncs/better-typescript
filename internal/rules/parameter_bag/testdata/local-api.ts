export interface WebServerOptions {
  readonly workspace: string
  readonly port: number
  readonly fetchImpl: typeof fetch
}

export function startWebServer(options: WebServerOptions): WebServerOptions {
  return options
}
