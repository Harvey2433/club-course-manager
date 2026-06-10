<script setup lang="ts">
import { computed } from 'vue'
import AccountLoginForm from './AccountLoginForm.vue'
import AccountRegisterForm from './AccountRegisterForm.vue'
import { useAccountAuthController } from '../../modules/account/useAccountAuthController'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const {
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
} = useAccountAuthController({
  visible: computed(() => props.modelValue),
  requestClose: () => {
    emit('update:modelValue', false)
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="auth-dialog-mask"
      @click="handleOverlayClick"
    >
      <section
        class="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="账户登录"
      >
        <header class="dialog-header">
          <div class="dialog-header-text">
            <h3 class="dialog-title">
              {{ currentView === 'register' ? '注册账户' : '登录账户' }}
            </h3>
            <p class="dialog-subtitle">
              {{
                currentView === 'register'
                  ? '创建账户后即可进入个人信息页'
                  : '登录后点击侧栏头像或昵称进入账户信息页面'
              }}
            </p>
          </div>

          <button
            class="dialog-close-btn"
            type="button"
            aria-label="关闭"
            title="关闭"
            @click="handleClose"
          >
            ×
          </button>
        </header>

        <div class="dialog-tabbar">
          <button
            type="button"
            class="dialog-tab"
            :class="{ active: currentView === 'login' }"
            :disabled="actionLoading"
            @click="switchView('login')"
          >
            登录
          </button>

          <button
            type="button"
            class="dialog-tab"
            :class="{ active: currentView === 'register' }"
            :disabled="actionLoading"
            @click="switchView('register')"
          >
            注册
          </button>
        </div>

        <div v-if="localError" class="status-banner error">
          {{ localError }}
        </div>

        <div v-if="localSuccess" class="status-banner success">
          {{ localSuccess }}
        </div>

        <div class="dialog-body">
          <AccountLoginForm
            v-if="currentView === 'login'"
            :form="loginForm"
            :loading="actionLoading"
            :focus-token="loginFocusToken"
            :auto-focus="true"
            @submit="handleLogin"
            @switch-register="switchView('register')"
          />

          <AccountRegisterForm
            v-else
            :form="registerForm"
            :loading="actionLoading"
            :focus-token="registerFocusToken"
            :auto-focus="true"
            @submit="handleRegister"
            @switch-login="switchView('login')"
          />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.auth-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(6px);
}

.auth-dialog {
  width: min(100%, 460px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.dialog-header {
  padding: 22px 22px 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #eff3f8;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.dialog-header-text {
  min-width: 0;
}

.dialog-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  color: #0f172a;
}

.dialog-subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #64748b;
}

.dialog-close-btn {
  width: 38px;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  color: #475569;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.dialog-close-btn:hover:not(:disabled) {
  background: #f8fafc;
  color: #0f172a;
  border-color: #cbd5e1;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.dialog-tabbar {
  padding: 16px 16px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dialog-tab {
  height: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.dialog-tab:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.dialog-tab.active {
  color: #2563eb;
  border-color: #bfdbfe;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.16);
}

.dialog-tab:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.status-banner {
  margin: 14px 16px 0;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.6;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.status-banner.error {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fffafa;
}

.status-banner.success {
  color: #166534;
  border-color: #bbf7d0;
  background: #f7fff9;
}

.dialog-body {
  padding-bottom: 8px;
}

@media (max-width: 640px) {
  .auth-dialog-mask {
    padding: 12px;
  }

  .auth-dialog {
    width: 100%;
    border-radius: 20px;
  }

  .dialog-header {
    padding: 18px 18px 12px;
  }

  .dialog-tabbar,
  .status-banner {
    margin-left: 0;
    margin-right: 0;
  }

  .dialog-tabbar {
    padding-left: 14px;
    padding-right: 14px;
  }

  .status-banner {
    margin-left: 14px;
    margin-right: 14px;
  }
}
</style>