type StartupState = {
  readonly billingReady: boolean
  readonly searchReady: boolean
}

const probe = async (service: string): Promise<boolean> => {
  const response = await fetch(`https://${service}.example/health`)
  return response.ok
}

export const loadStartupState = async (): Promise<StartupState> => {
  const [billingReady, searchReady] = await Promise.all([
    probe("billing"),
    probe("search"),
  ])
  return { billingReady, searchReady }
}
