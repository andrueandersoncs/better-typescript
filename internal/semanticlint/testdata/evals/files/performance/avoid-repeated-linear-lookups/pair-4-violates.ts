type Device = { readonly id: string; readonly tier: string }

export const routeDevices = (
  devices: ReadonlyArray<Device>,
  supportedTiers: ReadonlyArray<string>
): ReadonlyArray<string> => {
  const routed: Array<string> = []
  for (const device of devices) {
    if (supportedTiers.includes(device.tier)) {
      routed.push(device.id)
    }
  }
  return routed
}
