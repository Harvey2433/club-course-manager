<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

interface RegisterFormState {
  username: string
  displayName: string
  password: string
  confirmPassword: string
  remember: boolean
}

interface Props {
  form: RegisterFormState
  loading: boolean
  focusToken?: number
  autoFocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  focusToken: 0,
  autoFocus: false
})

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'switch-login'): void
}>()

const usernameInputRef = ref<HTMLInputElement | null>(null)

async function focusUsernameInput() {
  await nextTick()
  usernameInputRef.value?.focus()
  usernameInputRef.value?.select()
}

watch(
  () => props.focusToken,
  () => {
    void focusUsernameInput()
  }
)

onMounted(() => {
  if (props.autoFocus) {
    void focusUsernameInput()
  }
})
</script>

<template>
  <form class="account-form" @submit.prevent="emit('submit')">
    <label class="form-field">
      <span class="field-label">用户名</span>
      <input
        ref="usernameInputRef"
        v-model="form.username"
        class="field-input"
        type="text"
        maxlength="20"
        autocomplete="username"
        placeholder="2-20位，支持中文、字母、数字、_-.@"
      />
    </label>

    <label class="form-field">
      <span class="field-label">昵称</span>
      <input
        v-model="form.displayName"
        class="field-input"
        type="text"
        maxlength="24"
        autocomplete="nickname"
        placeholder="请输入昵称"
      />
    </label>

    <label class="form-field">
      <span class="field-label">密码</span>
      <input
        v-model="form.password"
        class="field-input"
        type="password"
        maxlength="32"
        autocomplete="new-password"
        placeholder="8-32位，至少包含字母和数字"
      />
    </label>

    <label class="form-field">
      <span class="field-label">确认密码</span>
      <input
        v-model="form.confirmPassword"
        class="field-input"
        type="password"
        maxlength="32"
        autocomplete="new-password"
        placeholder="请再次输入密码"
      />
    </label>

    <label class="checkbox-field">
      <input v-model="form.remember" class="checkbox-input" type="checkbox" />
      <span>注册后保持登录</span>
    </label>

    <div class="action-group">
      <button class="submit-btn" type="submit" :disabled="loading">
        {{ loading ? '注册中...' : '注册并登录' }}
      </button>

      <button
        class="switch-btn"
        type="button"
        :disabled="loading"
        @click="emit('switch-login')"
      >
        已有账户？去登录
      </button>
    </div>
  </form>
</template>

<style scoped>
.account-form {
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.field-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.field-input::placeholder {
  color: #94a3b8;
}

.field-input:focus {
  border-color: #bfdbfe;
  box-shadow: 0 0 0 4px rgba(191, 219, 254, 0.32);
}

.checkbox-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 13px;
  user-select: none;
}

.checkbox-input {
  margin: 0;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.submit-btn {
  width: 100%;
  height: 46px;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #ffffff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #f8fbff;
  border-color: #bfdbfe;
  box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.995);
}

.switch-btn {
  align-self: flex-start;
  padding: 6px 2px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.switch-btn:hover:not(:disabled) {
  color: #2563eb;
}

.submit-btn:disabled,
.switch-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>