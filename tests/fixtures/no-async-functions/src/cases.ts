export async function loadValue(): Promise<number> { // ~detect 8
  return 1
}

export const fetchValue = async (): Promise<number> => { // ~detect 27
  return 2
}

export const computeValue = async function (): Promise<number> { // ~detect 29
  return 3
}

export class Service {
  async start(): Promise<void> { // ~detect 3
    return
  }
}
