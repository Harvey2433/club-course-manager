import { DEFAULT_ACCOUNT_BIO } from './constants'
import type { AccountRole, AccountSession, StoredAccount } from './types'

export const ACCOUNT_STORAGE_KEY = 'club-course-manager.accounts.v2'
export const LOCAL_SESSION_STORAGE_KEY =
  'club-course-manager.account.local-session.v2'
export const SESSION_STORAGE_KEY =
  'club-course-manager.account.session.v2'

type StorageType = 'local' | 'session'

function getStorage(type: StorageType): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return type === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRole(value: unknown): AccountRole {
  if (value === 'admin') {
    return 'admin'
  }

  if (value === 'teacher') {
    return 'teacher'
  }

  return 'student'
}

function normalizeManagedClubIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )
}

function normalizeStoredAccount(value: unknown): StoredAccount | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.displayName !== 'string' ||
    (typeof value.avatar !== 'string' && value.avatar !== null) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    typeof value.usernameNormalized !== 'string' ||
    typeof value.passwordHash !== 'string' ||
    typeof value.salt !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    username: value.username,
    displayName: value.displayName,
    bio: typeof value.bio === 'string' ? value.bio : DEFAULT_ACCOUNT_BIO,
    avatar: value.avatar,
    role: normalizeRole(value.role),
    enterpriseEmail:
      typeof value.enterpriseEmail === 'string' ? value.enterpriseEmail : '',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    usernameNormalized: value.usernameNormalized,
    passwordHash: value.passwordHash,
    salt: value.salt,
    managedClubIds: normalizeManagedClubIds(value.managedClubIds)
  }
}

function isAccountSession(value: unknown): value is AccountSession {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.userId === 'string' && typeof value.loginAt === 'number'
}

export function readAccounts(): StoredAccount[] {
  const storage = getStorage('local')
  if (!storage) {
    return []
  }

  const parsed = safeParseJson(storage.getItem(ACCOUNT_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((item) => normalizeStoredAccount(item))
    .filter((item): item is StoredAccount => item !== null)
}

export function writeAccounts(accounts: StoredAccount[]) {
  const storage = getStorage('local')
  if (!storage) {
    throw new Error('当前环境不支持本地账户存储')
  }

  try {
    storage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts))
  } catch {
    throw new Error('账户数据保存失败，可能是本地存储空间不足')
  }
}

export function readSession(type: StorageType): AccountSession | null {
  const storage = getStorage(type)
  if (!storage) {
    return null
  }

  const key = type === 'local' ? LOCAL_SESSION_STORAGE_KEY : SESSION_STORAGE_KEY
  const parsed = safeParseJson(storage.getItem(key))

  if (!isAccountSession(parsed)) {
    return null
  }

  return parsed
}

export function writeSession(type: StorageType, session: AccountSession) {
  const storage = getStorage(type)
  if (!storage) {
    throw new Error('当前环境不支持会话存储')
  }

  const key = type === 'local' ? LOCAL_SESSION_STORAGE_KEY : SESSION_STORAGE_KEY

  try {
    storage.setItem(key, JSON.stringify(session))
  } catch {
    throw new Error('登录状态保存失败，可能是本地存储空间不足')
  }
}

export function clearSession(type: StorageType) {
  const storage = getStorage(type)
  if (!storage) {
    return
  }

  const key = type === 'local' ? LOCAL_SESSION_STORAGE_KEY : SESSION_STORAGE_KEY
  storage.removeItem(key)
}

export function clearAllSessions() {
  clearSession('local')
  clearSession('session')
}