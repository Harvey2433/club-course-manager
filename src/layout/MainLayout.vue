<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccountEntry from '../components/account/AccountEntry.vue'
import AuthDialog from '../components/account/AuthDialog.vue'
import { useAccount } from '../modules/account/useAccount'

const route = useRoute()
const router = useRouter()

const collapsed = ref(false)
const authDialogVisible = ref(false)

const {
  initialize,
  initialized,
  currentUser,
  isLoggedIn,
  displayName,
  secondaryText
} = useAccount()

onMounted(() => {
  void initialize()
})

const menus = computed(() => {
  const rootRoute = router.options.routes.find((item) => item.path === '/')

  if (!rootRoute?.children) {
    return []
  }

  return rootRoute.children
    .filter((child) => child.meta?.showSidebar !== false)
    .map((child) => ({
      path: child.path.startsWith('/') ? child.path : `/${child.path}`,
      label: (child.meta?.title as string) || child.path
    }))
})

const currentTitle = computed(() => {
  return (route.meta?.title as string) || '社团课程系统'
})

const accountAvatar = computed(() => {
  return currentUser.value?.avatar ?? null
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

async function handleAccountEntryClick() {
  if (!initialized.value) {
    return
  }

  if (!isLoggedIn.value) {
    authDialogVisible.value = true
    return
  }

  if (route.path === '/account') {
    return
  }

  await router.push('/account')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-header" :class="{ collapsed }">
        <div class="logo" :title="collapsed ? '社团课程系统' : ''">
          <div v-if="!collapsed" class="logo-mark">S</div>
          <div v-if="!collapsed" class="logo-text">社团课程系统</div>
        </div>

        <button
          class="collapse-btn"
          :class="{ collapsed }"
          type="button"
          :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleCollapsed"
        >
          <span class="collapse-icon">{{ collapsed ? '›' : '‹' }}</span>
        </button>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in menus"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          active-class="active"
          :title="collapsed ? item.label : ''"
        >
          <span class="nav-dot"></span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <AccountEntry
          :collapsed="collapsed"
          :loading="!initialized"
          :logged-in="isLoggedIn"
          :display-name="displayName"
          :secondary-text="secondaryText"
          :avatar="accountAvatar"
          @click="handleAccountEntryClick"
        />
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <h2>{{ currentTitle }}</h2>
      </header>

      <section class="content">
        <router-view />
      </section>
    </main>

    <AuthDialog v-model="authDialogVisible" />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f6f8fb;
}

.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition:
    width 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 2px 0 10px rgba(15, 23, 42, 0.03);
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 84px;
}

.sidebar-header {
  position: relative;
  min-height: 72px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.logo {
  min-height: 48px;
  padding-right: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.logo-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #111827;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

.collapse-btn {
  position: absolute;
  top: 18px;
  right: 14px;
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #475569;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.collapse-btn.collapsed {
  left: 14px;
  right: auto;
}

.collapse-btn:hover {
  background: #f8fafc;
  color: #111827;
  border-color: #cbd5e1;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
}

.collapse-btn:active {
  transform: scale(0.98);
}

.collapse-icon {
  font-size: 22px;
  line-height: 1;
  transform: translateY(-1px);
}

.sidebar.collapsed .nav-label {
  display: none;
}

.sidebar.collapsed .logo {
  padding-right: 0;
}

.nav {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
}

.nav-item {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #475569;
  text-decoration: none;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.nav-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.nav-item.active {
  background: #eef2ff;
  color: #1d4ed8;
  font-weight: 600;
}

.nav-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.75;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #f1f5f9;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.topbar {
  height: 64px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.topbar h2 {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  min-width: 0;
}
</style>