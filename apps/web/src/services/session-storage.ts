import {
  sessionCredentialsSchema,
  type SessionCredentials,
} from '@lgu/contracts'

import { STORAGE_KEY } from '../constants/app'

export interface SessionStorage {
  load(): SessionCredentials | null
  save(credentials: SessionCredentials): void
  clear(): void
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const browserSessionStorage: SessionStorage = {
  load() {
    const storage = getSessionStorage()
    if (!storage) return null
    try {
      const value = storage.getItem(STORAGE_KEY.SESSION)
      if (!value) return null
      const parsed = sessionCredentialsSchema.safeParse(JSON.parse(value))
      if (parsed.success) return parsed.data
      storage.removeItem(STORAGE_KEY.SESSION)
      return null
    } catch {
      try {
        storage?.removeItem(STORAGE_KEY.SESSION)
      } catch {
        // Ignore unavailable browser storage.
      }
      return null
    }
  },

  save(credentials) {
    try {
      getSessionStorage()?.setItem(
        STORAGE_KEY.SESSION,
        JSON.stringify(credentials),
      )
    } catch {
      // Private browsing or browser policy may disable persistence.
    }
  },

  clear() {
    try {
      getSessionStorage()?.removeItem(STORAGE_KEY.SESSION)
    } catch {
      // The in-memory store is still cleared when persistence is unavailable.
    }
  },
}
