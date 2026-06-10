<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'

interface Props {
  collapsed?: boolean
  loading?: boolean
  loggedIn: boolean
  displayName: string
  secondaryText: string
  avatar?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  loading: false,
  avatar: null
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const buttonTitle = computed(() => {
  if (props.loading) {
    return '账户信息加载中'
  }

  return props.loggedIn ? '打开账户信息页面' : '打开登录窗口'
})

function handleClick() {
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="account-entry"
    :class="{ collapsed }"
    :title="buttonTitle"
    @click="handleClick"
  >
    <UserAvatar
      :avatar="avatar"
      :name="displayName"
      :logged-in="loggedIn"
      :size="40"
    />

    <div v-if="!collapsed" class="account-meta">
      <div class="account-name">
        {{ loading ? '加载中...' : displayName }}
      </div>
      <div class="account-subtitle">
        {{ loading ? '正在同步账户状态' : secondaryText }}
      </div>
    </div>
  </button>
</template>

<style scoped>
.account-entry {
  width: 100%;
  min-height: 56px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.account-entry:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.04);
}

.account-entry:active {
  transform: scale(0.995);
}

.account-entry.collapsed {
  justify-content: center;
  padding: 8px;
}

.account-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-subtitle {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>