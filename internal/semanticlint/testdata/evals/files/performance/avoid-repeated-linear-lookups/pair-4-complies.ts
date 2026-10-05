type Device = { readonly id: string; readonly tier: string }

export const routeDevices = (
  devices: ReadonlyArray<Device>
): ReadonlyArray<string> => {
  const supportedTiers = ["starter", "standard", "enterprise"]
  const routed: Array<string> = []
  for (const device of devices) {
    if (supportedTiers.includes(device.tier)) {
      routed.push(device.id)
    }
  }
  return routed
}
