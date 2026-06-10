<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  avatar?: string | null
  name?: string
  loggedIn?: boolean
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  avatar: null,
  name: '',
  loggedIn: false,
  size: 40
})

const fallbackText = computed(() => {
  if (!props.loggedIn) {
    return 'U'
  }

  const source = String(props.name || '').trim()
  if (!source) {
    return 'U'
  }

  const firstCharacter = Array.from(source)[0] || 'U'
  return firstCharacter.toUpperCase()
})

const avatarStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`
  }
})
</script>

<template>
  <div
    class="user-avatar"
    :class="{
      'is-logged-in': loggedIn,
      'is-logged-out': !loggedIn
    }"
    :style="avatarStyle"
  >
    <img v-if="avatar" :src="avatar" alt="用户头像" class="avatar-image" />
    <span v-else class="avatar-fallback">{{ fallbackText }}</span>
  </div>
</template>

<style scoped>
.user-avatar {
  border-radius: 14px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.user-avatar.is-logged-in {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: #fff;
}

.user-avatar.is-logged-out {
  background: linear-gradient(135deg, #334155, #475569);
  color: #fff;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-fallback {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}
</style>