export const serviceMethodSubject = (serviceName: string) => (name: string) =>
  `${serviceName}.${name}`
