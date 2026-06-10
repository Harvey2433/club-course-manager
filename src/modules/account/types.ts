export type AccountRole = 'admin' | 'student' | 'teacher'

export interface AccountUser {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string | null
  role: AccountRole
  enterpriseEmail: string
  createdAt: number
  updatedAt: number
  managedClubIds: readonly string[]
}

export interface StoredAccount extends AccountUser {
  usernameNormalized: string
  passwordHash: string
  salt: string
}

export interface AccountSession {
  userId: string
  loginAt: number
}

export interface LoginPayload {
  username: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  username: string
  displayName: string
  password: string
  remember: boolean
}

export interface UpdateProfilePayload {
  displayName: string
  bio: string
  enterpriseEmail: string
  avatar?: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  nextPassword: string
}

export interface AdminUpdateAccountPayload {
  userId: string
  displayName: string
  bio: string
  role: AccountRole
  enterpriseEmail: string
  managedClubIds: string[]
  avatar?: string | null
}