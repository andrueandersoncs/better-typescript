export interface Combined {
  readonly left: string
}

export interface Combined {
  readonly right: number
}

export class Service {}

export namespace Service {
  export const make = () => new Service()
}
