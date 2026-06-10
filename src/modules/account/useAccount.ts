import { computed, readonly, ref } from 'vue'
import {
  apiAdminUpdateAccount,
  apiChangePassword,
  apiCurrentUser,
  apiListAccounts,
  apiLogin,
  apiLogout,
  apiRegister,
  apiUpdateProfile,
  type AccountUser
} from '../../api/backend'
import { processAvatarFile } from './avatar'
import { clearToken, readToken, writeToken, TOKEN_STORAGE_KEY } from '../../api/session'
import type {
  AdminUpdateAccountPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload
} from './types'

const currentUser = ref<AccountUser | null>(null)
const initialized = ref(false)
const actionLoading = ref(false)
const lastError = ref('')

let initializationPromise: Promise<void> | null = null
let storageListenerBound = false

function normalizeErrorMessage(error: unknown) {
  if (typeof error === 'string' && error) {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}

async function syncCurrentUser() {
  const token = readToken()

  if (!token) {
    currentUser.value = null
    return
  }

  const user = await apiCurrentUser(token)

  if (!user) {
    clearToken()
    currentUser.value = null
    return
  }

  currentUser.value = user
}

function bindStorageListener() {
  if (storageListenerBound || typeof window === 'undefined') {
    return
  }

  storageListenerBound = true

  window.addEventListener('storage', async (event) => {
    if (event.key && event.key !== TOKEN_STORAGE_KEY) {
      return
    }

    try {
      await syncCurrentUser()
      initialized.value = true
      lastError.value = ''
    } catch (error) {
      currentUser.value = null
      initialized.value = true
      lastError.value = normalizeErrorMessage(error)
    }
  })
}

export function useAccount() {
  const isLoggedIn = computed(() => currentUser.value !== null)

  const displayName = computed(() => {
    if (!currentUser.value) {
      return '未登录'
    }

    return currentUser.value.displayName || currentUser.value.username
  })

  const secondaryText = computed(() => {
    if (!initialized.value) {
      return '正在同步账户状态'
    }

    if (!currentUser.value) {
      return '点击登录'
    }

    const roleLabel =
      currentUser.value.role === 'admin'
        ? '管理员'
        : currentUser.value.role === 'teacher'
          ? '教师'
          : '学生'

    return `${currentUser.value.username} · ${roleLabel}`
  })

  async function initialize() {
    bindStorageListener()

    if (initialized.value) {
      return
    }

    if (initializationPromise) {
      return initializationPromise
    }

    initializationPromise = (async () => {
      try {
        await syncCurrentUser()
        lastError.value = ''
      } catch (error) {
        currentUser.value = null
        lastError.value = normalizeErrorMessage(error)
      } finally {
        initialized.value = true
        initializationPromise = null
      }
    })()

    return initializationPromise
  }

  async function login(payload: LoginPayload) {
    actionLoading.value = true
    lastError.value = ''

    try {
      const result = await apiLogin(payload.username, payload.password)
      writeToken(result.token)
      currentUser.value = result.user
      return result.user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    actionLoading.value = true
    lastError.value = ''

    try {
      const result = await apiRegister(
        payload.username,
        payload.displayName,
        payload.password
      )
      writeToken(result.token)
      currentUser.value = result.user
      return result.user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    const token = readToken()

    if (!currentUser.value || !token) {
      const message = '当前未登录，请先登录'
      lastError.value = message
      throw new Error(message)
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const user = await apiUpdateProfile(token, payload)
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function changePassword(payload: ChangePasswordPayload) {
    const token = readToken()

    if (!currentUser.value || !token) {
      const message = '当前未登录，请先登录'
      lastError.value = message
      throw new Error(message)
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const user = await apiChangePassword(
        token,
        payload.currentPassword,
        payload.nextPassword
      )
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function listAccounts() {
    const token = readToken()

    if (!currentUser.value || !token) {
      const message = '当前未登录，请先登录'
      lastError.value = message
      throw new Error(message)
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      return await apiListAccounts(token)
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function adminUpdateAccount(payload: AdminUpdateAccountPayload) {
    const token = readToken()

    if (!currentUser.value || !token) {
      const message = '当前未登录，请先登录'
      lastError.value = message
      throw new Error(message)
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const updatedUser = await apiAdminUpdateAccount(token, payload)

      if (currentUser.value && updatedUser.id === currentUser.value.id) {
        currentUser.value = updatedUser
      }

      return updatedUser
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  async function logout() {
    actionLoading.value = true
    lastError.value = ''

    try {
      const token = readToken()
      if (token) {
        await apiLogout(token)
      }
      clearToken()
      currentUser.value = null
    } catch (error) {
      // 即便后端登出失败，本地 token 也应清除
      clearToken()
      currentUser.value = null
      lastError.value = normalizeErrorMessage(error)
    } finally {
      actionLoading.value = false
    }
  }

  async function prepareAvatarFile(file: File) {
    return await processAvatarFile(file)
  }

  function clearError() {
    lastError.value = ''
  }

  return {
    currentUser: readonly(currentUser),
    initialized: readonly(initialized),
    actionLoading: readonly(actionLoading),
    lastError: readonly(lastError),
    isLoggedIn,
    displayName,
    secondaryText,
    initialize,
    login,
    register,
    updateProfile,
    changePassword,
    listAccounts,
    adminUpdateAccount,
    logout,
    prepareAvatarFile,
    clearError
  }
}