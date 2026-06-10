import { computed, readonly, ref } from 'vue'
import {
  ACCOUNT_STORAGE_KEY,
  LOCAL_SESSION_STORAGE_KEY,
  SESSION_STORAGE_KEY
} from './storage'
import {
  adminUpdateLocalAccount,
  changeLocalAccountPassword,
  listLocalAccountsForAdmin,
  loginLocalAccount,
  logoutLocalAccount,
  prepareAvatarDataUrl,
  registerLocalAccount,
  restoreAccountSession,
  updateLocalAccountProfile
} from './service'
import type {
  AccountUser,
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
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}

async function syncCurrentUser() {
  currentUser.value = await restoreAccountSession()
}

function bindStorageListener() {
  if (storageListenerBound || typeof window === 'undefined') {
    return
  }

  storageListenerBound = true

  window.addEventListener('storage', async (event) => {
    if (
      event.key &&
      event.key !== ACCOUNT_STORAGE_KEY &&
      event.key !== LOCAL_SESSION_STORAGE_KEY &&
      event.key !== SESSION_STORAGE_KEY
    ) {
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
      const user = await loginLocalAccount(payload)
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    actionLoading.value = true
    lastError.value = ''

    try {
      const user = await registerLocalAccount(payload)
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    if (!currentUser.value) {
      const error = new Error('当前未登录，请先登录')
      lastError.value = error.message
      throw error
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const user = await updateLocalAccountProfile(currentUser.value.id, payload)
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function changePassword(payload: ChangePasswordPayload) {
    if (!currentUser.value) {
      const error = new Error('当前未登录，请先登录')
      lastError.value = error.message
      throw error
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const user = await changeLocalAccountPassword(currentUser.value.id, payload)
      currentUser.value = user
      return user
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function listAccounts() {
    if (!currentUser.value) {
      const error = new Error('当前未登录，请先登录')
      lastError.value = error.message
      throw error
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      return await listLocalAccountsForAdmin(currentUser.value.id)
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function adminUpdateAccount(payload: AdminUpdateAccountPayload) {
    if (!currentUser.value) {
      const error = new Error('当前未登录，请先登录')
      lastError.value = error.message
      throw error
    }

    actionLoading.value = true
    lastError.value = ''

    try {
      const updatedUser = await adminUpdateLocalAccount(
        currentUser.value.id,
        payload
      )

      if (updatedUser.id === currentUser.value.id) {
        currentUser.value = updatedUser
      }

      return updatedUser
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function logout() {
    actionLoading.value = true
    lastError.value = ''

    try {
      await logoutLocalAccount()
      currentUser.value = null
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  async function prepareAvatarFile(file: File) {
    return await prepareAvatarDataUrl(file)
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