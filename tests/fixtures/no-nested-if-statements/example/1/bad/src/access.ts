declare const user: { readonly isActive: boolean } | null
declare const grantAccess: () => void

export const ensureAccess = (): void => {
  if (user) {
    if (user.isActive) {
      grantAccess()
    }
  }
}
