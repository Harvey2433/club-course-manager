<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import UserAvatar from './UserAvatar.vue'
import {
  DEFAULT_ACCOUNT_BIO,
  MAX_ACCOUNT_BIO_LENGTH
} from '../../modules/account/constants'
import type { AccountRole, AccountUser } from '../../modules/account/types'

interface ProfileFormState {
  displayName: string
  bio: string
  role: AccountRole
  enterpriseEmail: string
}

interface PasswordFormState {
  currentPassword: string
  nextPassword: string
  confirmPassword: string
}

interface Props {
  user: AccountUser | null
  form: ProfileFormState
  passwordForm: PasswordFormState
  avatar: string | null
  loading: boolean
  displayNameEditing: boolean
  createdAtText: string
  updatedAtText: string
  errorMessage?: string
  successMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  errorMessage: '',
  successMessage: ''
})

const emit = defineEmits<{
  (e: 'start-edit-display-name'): void
  (e: 'cancel-edit-display-name'): void
  (e: 'save-display-name'): void
  (e: 'save-profile'): void
  (e: 'change-password'): void
  (e: 'logout'): void
  (e: 'select-avatar', file: File): void
  (e: 'remove-avatar'): void
}>()

const avatarInputRef = ref<HTMLInputElement | null>(null)
const displayNameInputRef = ref<HTMLInputElement | null>(null)

const previewName = computed(() => {
  const nextDisplayName = String(props.form.displayName || '').trim()

  if (nextDisplayName) {
    return nextDisplayName
  }

  if (props.user?.displayName) {
    return props.user.displayName
  }

  if (props.user?.username) {
    return props.user.username
  }

  return '未登录'
})

const roleLabel = computed(() => {
  if (props.form.role === 'admin') {
    return '管理员'
  }

  return props.form.role === 'teacher' ? '教师' : '学生'
})

const bioLength = computed(() => {
  return String(props.form.bio || '').length
})

watch(
  () => props.displayNameEditing,
  async (editing) => {
    if (!editing) {
      return
    }

    await nextTick()
    displayNameInputRef.value?.focus()
    displayNameInputRef.value?.select()
  }
)

function triggerAvatarInput() {
  if (props.loading) {
    return
  }

  avatarInputRef.value?.click()
}

function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0] || null

  if (input) {
    input.value = ''
  }

  if (!file) {
    return
  }

  emit('select-avatar', file)
}

function handleDisplayNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('save-display-name')
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel-edit-display-name')
  }
}
</script>

<template>
  <div class="account-page">
    <div v-if="errorMessage" class="status-box error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="status-box success">{{ successMessage }}</div>

    <section class="hero-card">
      <div class="avatar-panel">
        <UserAvatar :avatar="avatar" :name="previewName" :logged-in="true" :size="96" />

        <input
          ref="avatarInputRef"
          class="hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="handleAvatarChange"
        />

        <div class="avatar-actions">
          <button
            class="ghost-btn"
            type="button"
            :disabled="loading"
            @click="triggerAvatarInput"
          >
            更换头像
          </button>

          <button
            class="ghost-btn danger"
            type="button"
            :disabled="loading || !avatar"
            @click="emit('remove-avatar')"
          >
            移除头像
          </button>
        </div>
      </div>

      <div class="hero-main">
        <div class="name-row">
          <template v-if="displayNameEditing">
            <input
              ref="displayNameInputRef"
              v-model="form.displayName"
              class="name-input"
              type="text"
              maxlength="24"
              placeholder="请输入昵称"
              :disabled="loading"
              @keydown="handleDisplayNameKeydown"
            />

            <button
              class="mini-btn primary"
              type="button"
              :disabled="loading"
              @click="emit('save-display-name')"
            >
              保存
            </button>

            <button
              class="mini-btn"
              type="button"
              :disabled="loading"
              @click="emit('cancel-edit-display-name')"
            >
              取消
            </button>
          </template>

          <template v-else>
            <h3 class="display-name">{{ previewName }}</h3>

            <button
              class="icon-btn"
              type="button"
              :disabled="loading"
              title="编辑昵称"
              aria-label="编辑昵称"
              @click="emit('start-edit-display-name')"
            >
              ✎
            </button>
          </template>
        </div>

        <div class="meta-row">
          <span>@{{ user?.username || '—' }}</span>
          <span class="meta-dot">·</span>
          <span>{{ roleLabel }}</span>
        </div>

        <label class="bio-field">
          <span class="field-label">个人简介</span>
          <textarea
            v-model="form.bio"
            class="field-textarea"
            :maxlength="MAX_ACCOUNT_BIO_LENGTH"
            :disabled="loading"
            placeholder="介绍一下你自己吧"
          ></textarea>
          <span class="field-tip">
            {{ bioLength }}/{{ MAX_ACCOUNT_BIO_LENGTH }}
          </span>
        </label>

        <div class="hero-actions">
          <button
            class="primary-btn"
            type="button"
            :disabled="loading"
            @click="emit('save-profile')"
          >
            {{ loading ? '保存中...' : '保存资料' }}
          </button>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <section class="section-card">
        <div class="section-header">
          <h4>账户权限</h4>
          <p>权限由管理员统一分配，个人中心仅可维护基础资料。</p>
        </div>

        <div class="form-stack">
          <label class="form-field">
            <span class="field-label">权限类型</span>
            <input class="field-input readonly" type="text" :value="roleLabel" readonly />
          </label>

          <label class="form-field">
            <span class="field-label">企业邮箱</span>
            <input
              v-model="form.enterpriseEmail"
              class="field-input"
              type="email"
              maxlength="80"
              :disabled="loading || form.role === 'admin'"
              :placeholder="
                form.role === 'teacher'
                  ? '请输入企业邮箱'
                  : form.role === 'admin'
                    ? '管理员账户无需填写企业邮箱'
                    : '学生可选填邮箱'
              "
            />
          </label>

          <div class="button-row">
            <button
              class="ghost-btn primary-text"
              type="button"
              :disabled="loading"
              @click="emit('save-profile')"
            >
              保存资料
            </button>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <h4>安全设置</h4>
          <p>修改密码后，下次登录请使用新密码。</p>
        </div>

        <div class="form-stack">
          <label class="form-field">
            <span class="field-label">当前密码</span>
            <input
              v-model="passwordForm.currentPassword"
              class="field-input"
              type="password"
              maxlength="32"
              autocomplete="current-password"
              :disabled="loading"
              placeholder="请输入当前密码"
            />
          </label>

          <label class="form-field">
            <span class="field-label">新密码</span>
            <input
              v-model="passwordForm.nextPassword"
              class="field-input"
              type="password"
              maxlength="32"
              autocomplete="new-password"
              :disabled="loading"
              placeholder="8-32位，至少包含字母和数字"
            />
          </label>

          <label class="form-field">
            <span class="field-label">确认新密码</span>
            <input
              v-model="passwordForm.confirmPassword"
              class="field-input"
              type="password"
              maxlength="32"
              autocomplete="new-password"
              :disabled="loading"
              placeholder="请再次输入新密码"
            />
          </label>

          <div class="button-row">
            <button
              class="ghost-btn primary-text"
              type="button"
              :disabled="loading"
              @click="emit('change-password')"
            >
              {{ loading ? '提交中...' : '修改密码' }}
            </button>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <h4>账户信息</h4>
          <p>这里展示当前账户的基础资料。</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ user?.username || '—' }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">当前权限</span>
            <span class="info-value">{{ roleLabel }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">企业邮箱</span>
            <span class="info-value">
              {{ user?.enterpriseEmail || form.enterpriseEmail || '未填写' }}
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ createdAtText }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">最近更新</span>
            <span class="info-value">{{ updatedAtText }}</span>
          </div>

          <div class="info-item">
            <span class="info-label">个人简介</span>
            <span class="info-value multiline">
              {{ form.bio || DEFAULT_ACCOUNT_BIO }}
            </span>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <h4>登录状态</h4>
          <p>退出登录后将返回系统主工作区。</p>
        </div>

        <div class="button-row">
          <button
            class="ghost-btn danger"
            type="button"
            :disabled="loading"
            @click="emit('logout')"
          >
            {{ loading ? '处理中...' : '退出登录' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.account-page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.status-box {
  padding: 0.95rem 1rem;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.9rem;
}

.status-box.error {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff5f5;
}

.status-box.success {
  color: #166534;
  border-color: #bbf7d0;
  background: #f7fff8;
}

.hero-card,
.section-card {
  background: white;
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.hero-card {
  padding: 1.4rem;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 1.4rem;
  align-items: start;
}

.avatar-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hidden-input {
  display: none;
}

.avatar-actions,
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  flex-wrap: wrap;
}

.display-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
  word-break: break-word;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.meta-dot {
  color: #cbd5e1;
}

.name-input,
.field-input,
.field-textarea {
  width: 100%;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: white;
  color: #0f172a;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.name-input,
.field-input {
  height: 44px;
  padding: 0 0.9rem;
}

.name-input {
  width: min(100%, 280px);
}

.field-textarea {
  min-height: 130px;
  padding: 0.8rem 0.9rem;
  resize: vertical;
  line-height: 1.7;
}

.name-input:focus,
.field-input:focus,
.field-textarea:focus {
  border-color: #bfdbfe;
  box-shadow: 0 0 0 4px rgba(191, 219, 254, 0.32);
}

.field-input.readonly {
  background: #f8fafc;
  color: #64748b;
}

.bio-field,
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  color: #334155;
  font-size: 0.88rem;
  font-weight: 600;
}

.field-tip {
  color: #94a3b8;
  font-size: 0.8rem;
  align-self: flex-end;
}

.hero-actions {
  display: flex;
  justify-content: flex-start;
}

.primary-btn,
.ghost-btn,
.icon-btn,
.mini-btn {
  border: 1px solid #dbe4ee;
  background: white;
  color: #334155;
  border-radius: 12px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.primary-btn,
.ghost-btn {
  min-height: 42px;
  padding: 0 1rem;
  font-size: 0.92rem;
  font-weight: 600;
}

.primary-btn {
  color: #2563eb;
}

.primary-btn:hover:not(:disabled),
.ghost-btn:hover:not(:disabled),
.icon-btn:hover:not(:disabled),
.mini-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
}

.primary-btn:active:not(:disabled),
.ghost-btn:active:not(:disabled),
.icon-btn:active:not(:disabled),
.mini-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.ghost-btn.primary-text,
.mini-btn.primary {
  color: #2563eb;
}

.ghost-btn.danger {
  color: #b91c1c;
}

.icon-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.mini-btn {
  min-height: 38px;
  padding: 0 0.85rem;
  font-size: 0.86rem;
  font-weight: 600;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem;
}

.section-card {
  padding: 1.3rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.section-header p {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.6;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
}

.info-item {
  border: 1px solid #edf2f7;
  background: #fbfcfe;
  border-radius: 12px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.info-label {
  color: #64748b;
  font-size: 0.82rem;
}

.info-value {
  color: #0f172a;
  font-size: 0.92rem;
  font-weight: 600;
  word-break: break-word;
  line-height: 1.6;
}

.info-value.multiline {
  white-space: pre-wrap;
}

.primary-btn:disabled,
.ghost-btn:disabled,
.icon-btn:disabled,
.mini-btn:disabled,
.name-input:disabled,
.field-input:disabled,
.field-textarea:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .avatar-panel {
    align-items: flex-start;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>