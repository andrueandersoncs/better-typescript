export async function loadValue(): Promise<number> {
  return 1
}

export const fetchValue = async (): Promise<number> => {
  return 2
}

export const computeValue = async function (): Promise<number> {
  return 3
}

export class Service {
  async start(): Promise<void> {
    return
  }
}
