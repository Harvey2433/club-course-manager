<script setup lang="ts">
import { computed, ref } from 'vue'
import UserAvatar from './UserAvatar.vue'
import { DEFAULT_ACCOUNT_BIO } from '../../modules/account/constants'
import type { AccountUser } from '../../modules/account/types'

interface ProfileFormState {
  displayName: string
  bio: string
}

interface Props {
  user: AccountUser | null
  form: ProfileFormState
  avatar: string | null
  loading: boolean
  createdAtText: string
  updatedAtText: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'submit'): void
  (e: 'logout'): void
  (e: 'select-avatar', file: File): void
  (e: 'remove-avatar'): void
}>()

const avatarInputRef = ref<HTMLInputElement | null>(null)

const previewName = computed(() => {
  const value = String(props.form.displayName || '').trim()

  if (value) {
    return value
  }

  if (props.user?.displayName) {
    return props.user.displayName
  }

  if (props.user?.username) {
    return props.user.username
  }

  return '未登录'
})

const previewBio = computed(() => {
  const value = String(props.form.bio || '').trim()
  return value || DEFAULT_ACCOUNT_BIO
})

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
</script>

<template>
  <div class="profile-panel">
    <section class="summary-card">
      <div class="summary-left">
        <UserAvatar
          :avatar="avatar"
          :name="previewName"
          :logged-in="true"
          :size="76"
        />
      </div>

      <div class="summary-right">
        <div class="summary-name">{{ previewName }}</div>
        <div class="summary-bio">{{ previewBio }}</div>
      </div>
    </section>

    <section class="section-card">
      <div class="section-title">头像</div>

      <input
        ref="avatarInputRef"
        class="hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        @change="handleAvatarChange"
      />

      <div class="button-row">
        <button
          class="action-btn"
          type="button"
          :disabled="loading"
          @click="triggerAvatarInput"
        >
          上传头像
        </button>

        <button
          class="action-btn danger-text"
          type="button"
          :disabled="loading || !avatar"
          @click="emit('remove-avatar')"
        >
          移除头像
        </button>
      </div>
    </section>

    <form class="section-card form-card" @submit.prevent="emit('submit')">
      <div class="section-title">基础资料</div>

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
        <span class="field-label">个人简介</span>
        <textarea
          v-model="form.bio"
          class="field-textarea"
          maxlength="120"
          placeholder="请输入个人简介"
        ></textarea>
      </label>

      <label class="form-field">
        <span class="field-label">用户名</span>
        <input
          class="field-input readonly"
          type="text"
          :value="user?.username || ''"
          readonly
        />
      </label>

      <div class="info-grid">
        <div class="info-card">
          <span class="info-label">注册时间</span>
          <span class="info-value">{{ createdAtText }}</span>
        </div>

        <div class="info-card">
          <span class="info-label">最近更新</span>
          <span class="info-value">{{ updatedAtText }}</span>
        </div>
      </div>

      <button class="action-btn save-btn" type="submit" :disabled="loading">
        {{ loading ? '保存中...' : '保存资料' }}
      </button>
    </form>

    <section class="section-card">
      <div class="section-title">账户操作</div>

      <button
        class="action-btn danger-text"
        type="button"
        :disabled="loading"
        @click="emit('logout')"
      >
        {{ loading ? '处理中...' : '退出登录' }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.profile-panel {
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.summary-card,
.section-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.03);
}

.summary-card {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px;
  align-items: center;
  padding: 18px;
}

.summary-left {
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-right {
  min-width: 0;
}

.summary-name {
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-word;
}

.summary-bio {
  margin-top: 8px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.section-card {
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 14px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hidden-input {
  display: none;
}

.form-card {
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

.field-input,
.field-textarea {
  border-radius: 12px;
  border: 1px solid #dbe3ee;
  background: #fff;
  color: #0f172a;
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.field-input {
  height: 46px;
}

.field-textarea {
  min-height: 110px;
  resize: vertical;
  line-height: 1.6;
}

.field-input:focus,
.field-textarea:focus {
  border-color: #bfdbfe;
  box-shadow: 0 0 0 4px rgba(191, 219, 254, 0.35);
}

.field-input.readonly {
  background: #f8fafc;
  color: #64748b;
  cursor: not-allowed;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-card {
  min-height: 84px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.info-label {
  font-size: 12px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.6;
  word-break: break-word;
}

.action-btn {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #dbe3ee;
  background: #fff;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  box-shadow: 0 10px 20px rgba(148, 163, 184, 0.08);
}

.action-btn:active:not(:disabled) {
  transform: scale(0.995);
}

.action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.save-btn {
  color: #2563eb;
  border-color: #dbeafe;
}

.danger-text {
  color: #b91c1c;
}

@media (max-width: 640px) {
  .profile-panel {
    padding-left: 16px;
    padding-right: 16px;
  }

  .summary-card {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>