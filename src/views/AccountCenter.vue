<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AccountProfilePage from '../components/account/AccountProfilePage.vue'
import { useAccount } from '../modules/account/useAccount'
import { useAccountProfileController } from '../modules/account/useAccountProfileController'

const router = useRouter()

const { initialize, initialized, isLoggedIn, lastError } = useAccount()

const controller = useAccountProfileController()

const {
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
} = controller

onMounted(() => {
  void initialize()
})

watch(
  [initialized, isLoggedIn],
  ([ready, loggedIn]) => {
    if (!ready) {
      return
    }

    if (!loggedIn) {
      void router.replace('/courses')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="account-center-page">
    <div class="page-header">
      <h3>个人中心</h3>
      <p class="page-desc">维护头像、昵称、简介、邮箱与账户安全设置</p>
    </div>

    <div v-if="!initialized" class="status-box">正在加载账户信息...</div>
    <div v-else-if="lastError" class="status-box error">{{ lastError }}</div>
    <div v-else-if="!isLoggedIn" class="status-box">登录状态已失效，正在返回...</div>

    <AccountProfilePage
      v-else
      :user="currentUser"
      :form="profileForm"
      :password-form="passwordForm"
      :avatar="profileAvatar"
      :loading="actionLoading"
      :display-name-editing="displayNameEditing"
      :created-at-text="userCreatedAtText"
      :updated-at-text="userUpdatedAtText"
      :error-message="localError"
      :success-message="localSuccess"
      @start-edit-display-name="startDisplayNameEdit"
      @cancel-edit-display-name="cancelDisplayNameEdit"
      @save-display-name="handleSaveDisplayName"
      @save-profile="handleSaveProfile"
      @change-password="handleChangePassword"
      @logout="handleLogout"
      @select-avatar="handleSelectAvatar"
      @remove-avatar="handleRemoveAvatar"
    />
  </div>
</template>

<style scoped>
.account-center-page {
  max-width: 1200px;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
}

.page-desc {
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.status-box {
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.status-box.error {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff5f5;
}
</style>