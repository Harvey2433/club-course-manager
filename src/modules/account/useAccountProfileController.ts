import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_ACCOUNT_BIO } from './constants'
import {
  sanitizeBio,
  sanitizeDisplayName,
  sanitizeEnterpriseEmail,
  validateBio,
  validateDisplayName,
  validateEnterpriseEmail,
  validatePassword
} from './security'
import { useAccount } from './useAccount'
import type { AccountRole } from './types'

export function useAccountProfileController() {
  const {
    currentUser,
    actionLoading,
    updateProfile,
    changePassword,
    logout,
    prepareAvatarFile,
    clearError
  } = useAccount()

  const localError = ref('')
  const localSuccess = ref('')
  const displayNameEditing = ref(false)

  const profileForm = reactive({
    displayName: '',
    bio: DEFAULT_ACCOUNT_BIO,
    role: 'student' as AccountRole,
    enterpriseEmail: ''
  })

  const passwordForm = reactive({
    currentPassword: '',
    nextPassword: '',
    confirmPassword: ''
  })

  const profileAvatar = ref<string | null>(null)
  const avatarChanged = ref(false)

  const userCreatedAtText = computed(() => {
    if (!currentUser.value) {
      return '—'
    }

    return formatDateTime(currentUser.value.createdAt)
  })

  const userUpdatedAtText = computed(() => {
    if (!currentUser.value) {
      return '—'
    }

    return formatDateTime(currentUser.value.updatedAt)
  })

  watch(
    currentUser,
    () => {
      syncProfileForm()
    },
    { immediate: true }
  )

  function resetMessages() {
    localError.value = ''
    localSuccess.value = ''
  }

  function clearPasswordForm() {
    passwordForm.currentPassword = ''
    passwordForm.nextPassword = ''
    passwordForm.confirmPassword = ''
  }

  function syncProfileForm() {
    profileForm.displayName =
      currentUser.value?.displayName || currentUser.value?.username || ''
    profileForm.bio = currentUser.value?.bio || DEFAULT_ACCOUNT_BIO
    profileForm.role = currentUser.value?.role || 'student'
    profileForm.enterpriseEmail = currentUser.value?.enterpriseEmail || ''
    profileAvatar.value = currentUser.value?.avatar || null
    avatarChanged.value = false
    displayNameEditing.value = false
  }

  function startDisplayNameEdit() {
    if (actionLoading.value) {
      return
    }

    resetMessages()
    displayNameEditing.value = true
  }

  function cancelDisplayNameEdit() {
    if (actionLoading.value) {
      return
    }

    profileForm.displayName =
      currentUser.value?.displayName || currentUser.value?.username || ''
    displayNameEditing.value = false
    resetMessages()
  }

  async function persistProfile(successMessage: string) {
    resetMessages()
    clearError()

    if (!currentUser.value) {
      localError.value = '当前未登录，请先登录'
      return false
    }

    const displayName = sanitizeDisplayName(profileForm.displayName)
    const bio = sanitizeBio(profileForm.bio)
    const role = currentUser.value.role
    const enterpriseEmail = sanitizeEnterpriseEmail(profileForm.enterpriseEmail || '')

    const displayNameError = validateDisplayName(displayName)
    if (displayNameError) {
      localError.value = displayNameError
      return false
    }

    const bioError = validateBio(bio)
    if (bioError) {
      localError.value = bioError
      return false
    }

    const enterpriseEmailError = validateEnterpriseEmail(enterpriseEmail, role)
    if (enterpriseEmailError) {
      localError.value = enterpriseEmailError
      return false
    }

    try {
      await updateProfile({
        displayName,
        bio,
        enterpriseEmail,
        avatar: avatarChanged.value ? profileAvatar.value : undefined
      })

      syncProfileForm()
      localSuccess.value = successMessage
      return true
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
      return false
    }
  }

  async function handleSaveDisplayName() {
    const success = await persistProfile('昵称已更新')
    if (success) {
      displayNameEditing.value = false
    }
  }

  async function handleSaveProfile() {
    const success = await persistProfile('资料已保存')
    if (success) {
      displayNameEditing.value = false
    }
  }

  async function handleChangePassword() {
    resetMessages()
    clearError()

    if (!currentUser.value) {
      localError.value = '当前未登录，请先登录'
      return
    }

    if (!passwordForm.currentPassword) {
      localError.value = '请输入当前密码'
      return
    }

    const nextPasswordError = validatePassword(passwordForm.nextPassword)
    if (nextPasswordError) {
      localError.value = nextPasswordError
      return
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      localError.value = '两次输入的新密码不一致'
      return
    }

    if (passwordForm.currentPassword === passwordForm.nextPassword) {
      localError.value = '新密码不能与当前密码相同'
      return
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.nextPassword
      })

      clearPasswordForm()
      localSuccess.value = '密码已更新'
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
    }
  }

  async function handleLogout() {
    resetMessages()
    clearError()

    try {
      await logout()
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
    }
  }

  async function handleSelectAvatar(file: File) {
    resetMessages()
    clearError()

    try {
      const nextAvatar = await prepareAvatarFile(file)
      profileAvatar.value = nextAvatar
      avatarChanged.value = true
      localSuccess.value = '头像已更新，请记得保存资料'
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
    }
  }

  function handleRemoveAvatar() {
    resetMessages()
    profileAvatar.value = null
    avatarChanged.value = true
    localSuccess.value = '头像已移除，请记得保存资料'
  }

  return {
    currentUser,
    actionLoading,
    localError,
    localSuccess,
    displayNameEditing,
    profileForm,
    passwordForm,
    profileAvatar,
    userCreatedAtText,
    userUpdatedAtText,
    startDisplayNameEdit,
    cancelDisplayNameEdit,
    handleSaveDisplayName,
    handleSaveProfile,
    handleChangePassword,
    handleLogout,
    handleSelectAvatar,
    handleRemoveAvatar
  }
}

function formatDateTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp))
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}