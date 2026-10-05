type PartnerSettings = {
  readonly provider: string
  readonly clientId: string
  readonly clientCredential: string
}

const writeDiagnostic = (fields: Record<string, unknown>): void => {
  console.error("partner_unavailable", fields)
}

export const connectPartner = (settings: PartnerSettings): void => {
  writeDiagnostic({
    provider: settings.provider,
    clientId: settings.clientId,
    clientCredential: settings.clientCredential
  })
}
