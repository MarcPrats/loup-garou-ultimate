const ROLE_REVEAL_STORAGE_PREFIX = 'lgu:role-revealed:'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function getKey(scope: string): string {
  return `${ROLE_REVEAL_STORAGE_PREFIX}${scope}`
}

export function hasRoleBeenRevealed(scope: string | null | undefined): boolean {
  if (!scope) return false
  try {
    return getStorage()?.getItem(getKey(scope)) === 'true'
  } catch {
    return false
  }
}

export function markRoleAsRevealed(scope: string | null | undefined): void {
  if (!scope) return
  try {
    getStorage()?.setItem(getKey(scope), 'true')
  } catch {
    // Ignore unavailable browser storage.
  }
}
