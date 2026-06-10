export type {
  AccountRole,
  AccountUser
} from '../../api/backend'

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
  role: import('../../api/backend').AccountRole
  enterpriseEmail: string
  managedClubIds: string[]
  avatar?: string | null
}