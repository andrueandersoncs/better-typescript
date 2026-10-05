type RuntimeSettings = {
  readonly region: string
  readonly signingMaterial: string
}

const publish = (event: string, fields: Record<string, unknown>): void => {
  console.debug(event, fields)
}

export const startWorker = (settings: RuntimeSettings): void => {
  publish("worker_started", {
    region: settings.region,
    signingMaterial: settings.signingMaterial
  })
}
