import { readFile } from "node:fs/promises"
import { parse } from "yaml"

export interface DeployConfig {
  readonly service: string
  readonly replicas: number
  readonly region: string
}

const DEFAULT_REGION = "eu-west-1"

export const loadDeployConfig = async (path: string, env: string): Promise<DeployConfig> => {
  let region = DEFAULT_REGION
  const raw = await readFile(path, "utf8")
  const document = parse(raw) as Record<string, unknown>
  const service = String(document.service ?? "")
  if (service.length === 0) {
    throw new Error(`${path}: missing service name`)
  }
  const replicas = Number(document.replicas ?? 1)
  if (!Number.isInteger(replicas) || replicas < 1) {
    throw new Error(`${path}: replicas must be a positive integer`)
  }
  const overrides = (document.environments ?? {}) as Record<string, { region?: string }>
  if (overrides[env]?.region !== undefined) {
    region = overrides[env].region
  }
  return { service, replicas, region }
}
