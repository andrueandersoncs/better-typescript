declare const user: { readonly isActive: boolean; readonly hasPermission: boolean }
declare const grantAccess: () => Promise<void>

export const ensureAccess = async (): Promise<void> => {
  if (user.isActive && user.hasPermission) {
    await grantAccess()
  }
}
