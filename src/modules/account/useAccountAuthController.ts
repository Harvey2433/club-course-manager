import { onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue'
import {
  sanitizeDisplayName,
  sanitizeUsername,
  validateDisplayName,
  validatePassword,
  validateUsername
} from './security'
import { useAccount } from './useAccount'

type AuthView = 'login' | 'register'

interface UseAccountAuthControllerOptions {
  visible: Readonly<Ref<boolean>>
  requestClose: () => void
}

export function useAccountAuthController(
  options: UseAccountAuthControllerOptions
) {
  const {
    isLoggedIn,
    actionLoading,
    login,
    register,
    clearError
  } = useAccount()

  const currentView = ref<AuthView>('login')
  const localError = ref('')
  const localSuccess = ref('')
  const loginFocusToken = ref(0)
  const registerFocusToken = ref(0)

  const loginForm = reactive({
    username: '',
    password: '',
    remember: true
  })

  const registerForm = reactive({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    remember: true
  })

  let bodyOverflowCache = ''
  let escapeListenerBound = false

  watch(
    options.visible,
    (visible) => {
      if (visible) {
        openDialog()
      } else {
        closeDialog()
      }
    },
    { immediate: true }
  )

  watch(isLoggedIn, (loggedIn) => {
    if (!options.visible.value) {
      return
    }

    if (loggedIn) {
      options.requestClose()
    }
  })

  function openDialog() {
    resetMessages()
    clearError()
    lockBodyScroll()

    if (isLoggedIn.value) {
      options.requestClose()
      return
    }

    if (currentView.value === 'register') {
      registerFocusToken.value += 1
    } else {
      currentView.value = 'login'
      loginFocusToken.value += 1
    }

    bindEscapeListener()
  }

  function closeDialog() {
    resetMessages()
    clearSensitiveFields()
    unlockBodyScroll()
    unbindEscapeListener()
  }

  function resetMessages() {
    localError.value = ''
    localSuccess.value = ''
  }

  function clearSensitiveFields() {
    loginForm.password = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
  }

  function lockBodyScroll() {
    if (typeof document === 'undefined') {
      return
    }

    bodyOverflowCache = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  function unlockBodyScroll() {
    if (typeof document === 'undefined') {
      return
    }

    document.body.style.overflow = bodyOverflowCache
  }

  function bindEscapeListener() {
    if (escapeListenerBound || typeof window === 'undefined') {
      return
    }

    escapeListenerBound = true
    window.addEventListener('keydown', handleWindowKeydown)
  }

  function unbindEscapeListener() {
    if (!escapeListenerBound || typeof window === 'undefined') {
      return
    }

    escapeListenerBound = false
    window.removeEventListener('keydown', handleWindowKeydown)
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      void handleClose()
    }
  }

  async function handleClose() {
    if (actionLoading.value) {
      return
    }

    options.requestClose()
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      void handleClose()
    }
  }

  function switchView(targetView: AuthView) {
    if (actionLoading.value) {
      return
    }

    resetMessages()
    currentView.value = targetView

    if (targetView === 'login') {
      loginFocusToken.value += 1
      return
    }

    registerFocusToken.value += 1
  }

  async function handleLogin() {
    if (actionLoading.value) {
      return
    }

    resetMessages()
    clearError()

    const username = sanitizeUsername(loginForm.username)
    const usernameError = validateUsername(username)

    if (usernameError) {
      localError.value = usernameError
      return
    }

    if (!loginForm.password) {
      localError.value = '请输入密码'
      return
    }

    try {
      await login({
        username,
        password: loginForm.password,
        remember: loginForm.remember
      })

      clearSensitiveFields()
      localSuccess.value = '登录成功'
      options.requestClose()
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
    }
  }

  async function handleRegister() {
    if (actionLoading.value) {
      return
    }

    resetMessages()
    clearError()

    const username = sanitizeUsername(registerForm.username)
    const displayName = sanitizeDisplayName(registerForm.displayName)

    const usernameError = validateUsername(username)
    if (usernameError) {
      localError.value = usernameError
      return
    }

    const displayNameError = validateDisplayName(displayName)
    if (displayNameError) {
      localError.value = displayNameError
      return
    }

    const passwordError = validatePassword(registerForm.password)
    if (passwordError) {
      localError.value = passwordError
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      localError.value = '两次输入的密码不一致'
      return
    }

    try {
      await register({
        username,
        displayName,
        password: registerForm.password,
        remember: registerForm.remember
      })

      clearSensitiveFields()
      localSuccess.value = '注册成功'
      options.requestClose()
    } catch (error) {
      localError.value = normalizeErrorMessage(error)
    }
  }

  onBeforeUnmount(() => {
    unlockBodyScroll()
    unbindEscapeListener()
  })

  return {
    currentView,
    actionLoading,
    localError,
    localSuccess,
    loginFocusToken,
    registerFocusToken,
    loginForm,
    registerForm,
    handleClose,
    handleOverlayClick,
    switchView,
    handleLogin,
    handleRegister
  }
}

function normalizeErrorMessage(error: unknown) {
  if (typeof error === 'string' && error) {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '操作失败，请稍后重试'
}