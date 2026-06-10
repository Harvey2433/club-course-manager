import { DEFAULT_ACCOUNT_BIO } from './constants'
import { processAvatarFile } from './avatar'
import {
  createAccountId,
  createSalt,
  hashPassword,
  normalizeUsername,
  sanitizeBio,
  sanitizeDisplayName,
  sanitizeEnterpriseEmail,
  sanitizeUsername,
  validateAccountRole,
  validateBio,
  validateDisplayName,
  validateEnterpriseEmail,
  validatePassword,
  validateUsername
} from './security'
import {
  clearAllSessions,
  readAccounts,
  readSession,
  writeAccounts,
  writeSession
} from './storage'
import type {
  AccountRole,
  AccountUser,
  AdminUpdateAccountPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  StoredAccount,
  UpdateProfilePayload
} from './types'

const MAX_AVATAR_DATA_URL_LENGTH = 1024 * 1024
const ALLOWED_AVATAR_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/png;base64,',
  'data:image/webp;base64,',
  'data:image/gif;base64,'
]

const BUILTIN_ADMIN_USERNAME = 'admin'
const BUILTIN_ADMIN_PASSWORD = 'admin9876543'
const BUILTIN_ADMIN_SALT = 'club-course-manager-admin-salt-v2'

function toPublicUser(account: StoredAccount): AccountUser {
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    bio: account.bio || DEFAULT_ACCOUNT_BIO,
    avatar: account.avatar,
    role: account.role,
    enterpriseEmail: account.enterpriseEmail || '',
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    managedClubIds: Array.isArray(account.managedClubIds)
      ? [...account.managedClubIds]
      : []
  }
}

function getActiveSession() {
  return readSession('session') || readSession('local')
}

function ensureActiveAccount(userId: string, accounts: StoredAccount[]) {
  const account = accounts.find((item) => item.id === userId)

  if (!account) {
    clearAllSessions()
    throw new Error('当前登录状态已失效，请重新登录')
  }

  return account
}

function establishSession(userId: string, remember: boolean) {
  clearAllSessions()
  writeSession(remember ? 'local' : 'session', {
    userId,
    loginAt: Date.now()
  })
}

function normalizeAvatarDataUrl(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  const avatar = String(value)

  if (!ALLOWED_AVATAR_PREFIXES.some((prefix) => avatar.startsWith(prefix))) {
    throw new Error('头像数据格式不受支持')
  }

  if (avatar.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error('头像数据过大，请重新选择图片')
  }

  return avatar
}

function normalizeRole(value: string): AccountRole {
  if (value === 'admin') {
    return 'admin'
  }

  return value === 'teacher' ? 'teacher' : 'student'
}

function uniqueStringList(value: string[]) {
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )
}

async function buildBuiltinAdminAccount(now = Date.now()): Promise<StoredAccount> {
  const passwordHash = await hashPassword(
    BUILTIN_ADMIN_PASSWORD,
    BUILTIN_ADMIN_SALT
  )

  return {
    id: 'builtin-admin-account',
    username: BUILTIN_ADMIN_USERNAME,
    displayName: '系统管理员',
    bio: '内置管理员账户，可全局管理课程、社团、选课记录与用户信息。',
    avatar: null,
    role: 'admin',
    enterpriseEmail: '',
    createdAt: now,
    updatedAt: now,
    usernameNormalized: normalizeUsername(BUILTIN_ADMIN_USERNAME),
    passwordHash,
    salt: BUILTIN_ADMIN_SALT,
    managedClubIds: []
  }
}

async function ensureBuiltinAdminAccount() {
  const accounts = readAccounts()
  const admin = accounts.find(
    (item) => item.usernameNormalized === normalizeUsername(BUILTIN_ADMIN_USERNAME)
  )

  if (admin) {
    return accounts
  }

  const nextAccounts = [...accounts, await buildBuiltinAdminAccount()]
  writeAccounts(nextAccounts)
  return nextAccounts
}

function ensureAdminUser(account: StoredAccount | AccountUser | null | undefined) {
  if (!account || account.role !== 'admin') {
    throw new Error('仅管理员可执行该操作')
  }
}

export async function restoreAccountSession() {
  await ensureBuiltinAdminAccount()

  const session = getActiveSession()

  if (!session) {
    return null
  }

  const accounts = readAccounts()
  const account = accounts.find((item) => item.id === session.userId)

  if (!account) {
    clearAllSessions()
    return null
  }

  return toPublicUser(account)
}

export async function registerLocalAccount(payload: RegisterPayload) {
  const username = sanitizeUsername(payload.username)
  const displayName = sanitizeDisplayName(payload.displayName)
  const password = String(payload.password || '')
  const remember = Boolean(payload.remember)

  const usernameError = validateUsername(username)
  if (usernameError) {
    throw new Error(usernameError)
  }

  const displayNameError = validateDisplayName(displayName)
  if (displayNameError) {
    throw new Error(displayNameError)
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    throw new Error(passwordError)
  }

  const accounts = await ensureBuiltinAdminAccount()
  const usernameNormalized = normalizeUsername(username)

  const existed = accounts.some(
    (item) => item.usernameNormalized === usernameNormalized
  )

  if (existed) {
    throw new Error('该用户名已被注册，请更换其他用户名')
  }

  const now = Date.now()
  const salt = createSalt()
  const passwordHash = await hashPassword(password, salt)

  const account: StoredAccount = {
    id: createAccountId(),
    username,
    displayName,
    bio: DEFAULT_ACCOUNT_BIO,
    avatar: null,
    role: 'student',
    enterpriseEmail: '',
    createdAt: now,
    updatedAt: now,
    usernameNormalized,
    passwordHash,
    salt,
    managedClubIds: []
  }

  writeAccounts([...accounts, account])
  establishSession(account.id, remember)

  return toPublicUser(account)
}

export async function loginLocalAccount(payload: LoginPayload) {
  const username = sanitizeUsername(payload.username)
  const password = String(payload.password || '')
  const remember = Boolean(payload.remember)

  const usernameError = validateUsername(username)
  if (usernameError) {
    throw new Error(usernameError)
  }

  if (!password) {
    throw new Error('请输入密码')
  }

  const accounts = await ensureBuiltinAdminAccount()
  const usernameNormalized = normalizeUsername(username)
  const account = accounts.find(
    (item) => item.usernameNormalized === usernameNormalized
  )

  if (!account) {
    throw new Error('用户名或密码错误')
  }

  const passwordHash = await hashPassword(password, account.salt)
  if (passwordHash !== account.passwordHash) {
    throw new Error('用户名或密码错误')
  }

  establishSession(account.id, remember)

  return toPublicUser(account)
}

export async function updateLocalAccountProfile(
  currentUserId: string,
  payload: UpdateProfilePayload
) {
  await ensureBuiltinAdminAccount()

  const accounts = readAccounts()
  const account = ensureActiveAccount(currentUserId, accounts)

  const displayName = sanitizeDisplayName(payload.displayName)
  const bio = sanitizeBio(payload.bio)
  const enterpriseEmail = sanitizeEnterpriseEmail(payload.enterpriseEmail)
  const avatar = normalizeAvatarDataUrl(payload.avatar)

  const displayNameError = validateDisplayName(displayName)
  if (displayNameError) {
    throw new Error(displayNameError)
  }

  const bioError = validateBio(bio)
  if (bioError) {
    throw new Error(bioError)
  }

  const enterpriseEmailError = validateEnterpriseEmail(
    enterpriseEmail,
    account.role
  )
  if (enterpriseEmailError) {
    throw new Error(enterpriseEmailError)
  }

  const updatedAccount: StoredAccount = {
    ...account,
    displayName,
    bio,
    enterpriseEmail,
    avatar: avatar === undefined ? account.avatar : avatar,
    updatedAt: Date.now()
  }

  const nextAccounts = accounts.map((item) =>
    item.id === updatedAccount.id ? updatedAccount : item
  )

  writeAccounts(nextAccounts)

  return toPublicUser(updatedAccount)
}

export async function changeLocalAccountPassword(
  currentUserId: string,
  payload: ChangePasswordPayload
) {
  await ensureBuiltinAdminAccount()

  const accounts = readAccounts()
  const account = ensureActiveAccount(currentUserId, accounts)

  const currentPassword = String(payload.currentPassword || '')
  const nextPassword = String(payload.nextPassword || '')

  if (!currentPassword) {
    throw new Error('请输入当前密码')
  }

  const nextPasswordError = validatePassword(nextPassword)
  if (nextPasswordError) {
    throw new Error(nextPasswordError)
  }

  const currentHash = await hashPassword(currentPassword, account.salt)
  if (currentHash !== account.passwordHash) {
    throw new Error('当前密码错误')
  }

  if (currentPassword === nextPassword) {
    throw new Error('新密码不能与当前密码相同')
  }

  const nextSalt = createSalt()
  const nextHash = await hashPassword(nextPassword, nextSalt)

  const updatedAccount: StoredAccount = {
    ...account,
    salt: nextSalt,
    passwordHash: nextHash,
    updatedAt: Date.now()
  }

  const nextAccounts = accounts.map((item) =>
    item.id === updatedAccount.id ? updatedAccount : item
  )

  writeAccounts(nextAccounts)

  return toPublicUser(updatedAccount)
}

export async function listLocalAccountsForAdmin(currentUserId: string) {
  await ensureBuiltinAdminAccount()

  const accounts = readAccounts()
  const currentUser = ensureActiveAccount(currentUserId, accounts)
  ensureAdminUser(currentUser)

  return accounts
    .map((item) => toPublicUser(item))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function adminUpdateLocalAccount(
  currentUserId: string,
  payload: AdminUpdateAccountPayload
) {
  await ensureBuiltinAdminAccount()

  const accounts = readAccounts()
  const currentUser = ensureActiveAccount(currentUserId, accounts)
  ensureAdminUser(currentUser)

  const targetAccount = accounts.find((item) => item.id === payload.userId)
  if (!targetAccount) {
    throw new Error('目标用户不存在')
  }

  const displayName = sanitizeDisplayName(payload.displayName)
  const bio = sanitizeBio(payload.bio)
  const avatar = normalizeAvatarDataUrl(payload.avatar)
  const role = normalizeRole(payload.role)
  const managedClubIds = uniqueStringList(payload.managedClubIds || [])
  const enterpriseEmail =
    role === 'teacher'
      ? sanitizeEnterpriseEmail(payload.enterpriseEmail)
      : sanitizeEnterpriseEmail(payload.enterpriseEmail || '')

  const displayNameError = validateDisplayName(displayName)
  if (displayNameError) {
    throw new Error(displayNameError)
  }

  const bioError = validateBio(bio)
  if (bioError) {
    throw new Error(bioError)
  }

  const roleError = validateAccountRole(role)
  if (roleError) {
    throw new Error(roleError)
  }

  const enterpriseEmailError = validateEnterpriseEmail(enterpriseEmail, role)
  if (enterpriseEmailError) {
    throw new Error(enterpriseEmailError)
  }

  const nextRole =
    targetAccount.usernameNormalized === normalizeUsername(BUILTIN_ADMIN_USERNAME)
      ? 'admin'
      : role

  const updatedAccount: StoredAccount = {
    ...targetAccount,
    displayName,
    bio,
    role: nextRole,
    enterpriseEmail: nextRole === 'teacher' ? enterpriseEmail : '',
    managedClubIds: nextRole === 'teacher' ? managedClubIds : [],
    avatar: avatar === undefined ? targetAccount.avatar : avatar,
    updatedAt: Date.now()
  }

  const nextAccounts = accounts.map((item) =>
    item.id === updatedAccount.id ? updatedAccount : item
  )

  writeAccounts(nextAccounts)

  return toPublicUser(updatedAccount)
}

export async function logoutLocalAccount() {
  clearAllSessions()
}

export async function prepareAvatarDataUrl(file: File) {
  return await processAvatarFile(file)
}