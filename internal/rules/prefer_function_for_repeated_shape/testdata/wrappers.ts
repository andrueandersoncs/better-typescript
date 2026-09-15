type ResourceSpec = object
type AnyCommandBundle = object
type RpcBundle = object
type ApplicationSpec = object

declare const ApplicationParts: any
declare const Struct: any

const resourcePart = <const Spec extends ResourceSpec>(resource: Spec) => {
  const part = ApplicationParts.ResourcePart({ resource })
  return Struct.assign(part, { resource })
}

const commandPart = <const Bundle extends AnyCommandBundle>(bundle: Bundle) => {
  const part = ApplicationParts.CommandPart({ bundle })
  return Struct.assign(part, { bundle })
}

const nativePart = <const Bundle extends RpcBundle>(bundle: Bundle) => {
  const part = ApplicationParts.NativePart({ bundle })
  return Struct.assign(part, { bundle })
}

const applicationPart = <const Spec extends ApplicationSpec>(application: Spec) => {
  const part = ApplicationParts.ApplicationPart({ application })
  return Struct.assign(part, { application })
}

void resourcePart
void commandPart
void nativePart
void applicationPart
