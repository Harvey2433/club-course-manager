const TOKEN_KEY = 'club-course-manager.token.v3'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readToken(): string {
  return getStorage()?.getItem(TOKEN_KEY) || ''
}

export function writeToken(token: string) {
  getStorage()?.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  getStorage()?.removeItem(TOKEN_KEY)
}

export const TOKEN_STORAGE_KEY = TOKEN_KEY