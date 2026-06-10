<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAccount } from '../modules/account/useAccount'
import type { AccountRole, AccountUser } from '../api/backend'
import { useAppData } from '../modules/app-data/useAppData'

const {
  initialize: initializeAccount,
  currentUser,
  initialized: accountInitialized,
  listAccounts,
  adminUpdateAccount,
  actionLoading: accountActionLoading
} = useAccount()

const {
  initialize: initializeData,
  reload: reloadData,
  clubs,
  enrollmentViews,
  rankingEntries,
  version,
  actionLoading: dataActionLoading,
  lastError
} = useAppData()

const localError = ref('')
const localMessage = ref('')

const adminAccounts = ref<AccountUser[]>([])
const selectedUserId = ref('')

const userForm = reactive({
  displayName: '',
  bio: '',
  role: 'student' as AccountRole,
  enterpriseEmail: '',
  managedClubIds: [] as string[]
})

const isAdmin = computed(() => currentUser.value?.role === 'admin')

const visibleEnrollments = computed(() => enrollmentViews.value)
const rankingList = computed(() => rankingEntries.value)

const selectedAccount = computed(() => {
  return adminAccounts.value.find((item) => item.id === selectedUserId.value) || null
})

function resetMessages() {
  localError.value = ''
  localMessage.value = ''
}

function syncSelectedUserForm() {
  const target = selectedAccount.value

  if (!target) {
    userForm.displayName = ''
    userForm.bio = ''
    userForm.role = 'student'
    userForm.enterpriseEmail = ''
    userForm.managedClubIds = []
    return
  }

  userForm.displayName = target.displayName
  userForm.bio = target.bio
  userForm.role = target.role
  userForm.enterpriseEmail = target.enterpriseEmail
  userForm.managedClubIds = [...target.managedClubIds]
}

async function loadAdminAccounts() {
  if (!isAdmin.value) {
    adminAccounts.value = []
    selectedUserId.value = ''
    return
  }

  try {
    adminAccounts.value = await listAccounts()

    if (
      !selectedUserId.value ||
      !adminAccounts.value.some((item) => item.id === selectedUserId.value)
    ) {
      selectedUserId.value = adminAccounts.value[0]?.id || ''
    }

    syncSelectedUserForm()
  } catch (error) {
    localError.value =
      error instanceof Error ? error.message : '加载用户列表失败，请稍后重试'
  }
}

async function handleSaveUser() {
  if (!selectedAccount.value) {
    return
  }

  resetMessages()

  try {
    await adminUpdateAccount({
      userId: selectedAccount.value.id,
      displayName: userForm.displayName,
      bio: userForm.bio,
      role: userForm.role,
      enterpriseEmail: userForm.enterpriseEmail,
      managedClubIds:
        userForm.role === 'teacher' ? [...userForm.managedClubIds] : []
    })

    await loadAdminAccounts()
    await reloadData()
    localMessage.value = '用户信息已更新'
  } catch (error) {
    localError.value =
      error instanceof Error ? error.message : '保存用户信息失败，请稍后重试'
  }
}

watch(selectedUserId, () => {
  syncSelectedUserForm()
})

watch(
  [currentUser, version],
  async () => {
    if (isAdmin.value) {
      await loadAdminAccounts()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await initializeAccount()
  await initializeData()

  if (isAdmin.value) {
    await loadAdminAccounts()
  }
})
</script>

<template>
  <div class="enrollment-page">
    <div class="page-header">
      <h3>选课记录</h3>
      <p class="page-desc">
        管理员可查看全部记录、总排行榜并编辑所有用户信息；
        教师仅可查看自己所属社团区域的记录；学生仅查看自己的记录。
      </p>
    </div>

    <div v-if="!accountInitialized" class="status-box">正在加载...</div>

    <template v-else>
      <div v-if="lastError" class="status-box error">{{ lastError }}</div>
      <div v-if="localError" class="status-box error">{{ localError }}</div>
      <div v-if="localMessage" class="status-box success">{{ localMessage }}</div>

      <section class="section-card">
        <div class="section-header">
          <h4>总排行榜</h4>
          <p>按累计选课数降序排序。</p>
        </div>

        <div v-if="rankingList.length === 0" class="empty-box">暂无排行数据</div>

        <div v-else class="ranking-list">
          <div
            v-for="(item, index) in rankingList"
            :key="item.userId"
            class="ranking-item"
          >
            <div class="rank-index">{{ index + 1 }}</div>
            <div class="rank-main">
              <div class="rank-name">{{ item.displayName }}</div>
              <div class="rank-meta">
                @{{ item.username }} ·
                {{
                  item.role === 'admin'
                    ? '管理员'
                    : item.role === 'teacher'
                      ? '教师'
                      : '学生'
                }}
              </div>
            </div>
            <div class="rank-score">{{ item.enrolledCount }} 门</div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <h4>选课记录</h4>
          <p>共 {{ visibleEnrollments.length }} 条记录</p>
        </div>

        <div v-if="visibleEnrollments.length === 0" class="empty-box">
          暂无可查看的选课记录
        </div>

        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>学员</th>
                <th>角色</th>
                <th>课程</th>
                <th>社团</th>
                <th>授课老师</th>
                <th>选课时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in visibleEnrollments" :key="item.id">
                <td>{{ item.studentDisplayName }}（@{{ item.studentUsername }}）</td>
                <td>
                  {{
                    item.studentRole === 'admin'
                      ? '管理员'
                      : item.studentRole === 'teacher'
                        ? '教师'
                        : '学生'
                  }}
                </td>
                <td>{{ item.courseName }}</td>
                <td>{{ item.clubName }}</td>
                <td>{{ item.teacherName }}</td>
                <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="isAdmin" class="section-card">
        <div class="section-header">
          <h4>用户信息管理</h4>
          <p>管理员可编辑所有用户信息，并为教师分配可管理社团区域。</p>
        </div>

        <div class="admin-grid">
          <div class="user-list">
            <button
              v-for="item in adminAccounts"
              :key="item.id"
              class="user-item"
              :class="{ active: item.id === selectedUserId }"
              type="button"
              @click="selectedUserId = item.id"
            >
              <div class="user-item-name">{{ item.displayName }}</div>
              <div class="user-item-meta">
                @{{ item.username }} ·
                {{
                  item.role === 'admin'
                    ? '管理员'
                    : item.role === 'teacher'
                      ? '教师'
                      : '学生'
                }}
              </div>
            </button>
          </div>

          <div class="editor-panel">
            <template v-if="selectedAccount">
              <div class="form-grid">
                <label class="form-field">
                  <span>用户名</span>
                  <input
                    class="field-input readonly"
                    type="text"
                    :value="selectedAccount.username"
                    readonly
                  />
                </label>

                <label class="form-field">
                  <span>显示名称</span>
                  <input
                    v-model="userForm.displayName"
                    class="field-input"
                    type="text"
                    maxlength="24"
                  />
                </label>

                <label class="form-field">
                  <span>权限类型</span>
                  <select v-model="userForm.role" class="field-input">
                    <option value="student">学生</option>
                    <option value="teacher">教师</option>
                    <option value="admin">管理员</option>
                  </select>
                </label>

                <label class="form-field">
                  <span>企业邮箱</span>
                  <input
                    v-model="userForm.enterpriseEmail"
                    class="field-input"
                    type="email"
                    maxlength="80"
                    :placeholder="
                      userForm.role === 'teacher'
                        ? '教师必须填写企业邮箱'
                        : '非教师可留空'
                    "
                  />
                </label>

                <label class="form-field full">
                  <span>个人简介</span>
                  <textarea
                    v-model="userForm.bio"
                    class="field-textarea"
                    maxlength="120"
                  ></textarea>
                </label>

                <label v-if="userForm.role === 'teacher'" class="form-field full">
                  <span>可管理社团区域</span>
                  <select
                    v-model="userForm.managedClubIds"
                    class="field-input multi-select"
                    multiple
                  >
                    <option v-for="club in clubs" :key="club.id" :value="club.id">
                      {{ club.name }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="button-row">
                <button
                  class="primary-btn"
                  type="button"
                  :disabled="accountActionLoading || dataActionLoading"
                  @click="handleSaveUser"
                >
                  {{
                    accountActionLoading || dataActionLoading
                      ? '保存中...'
                      : '保存用户信息'
                  }}
                </button>
              </div>
            </template>

            <div v-else class="empty-box">请选择要管理的用户</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.enrollment-page {
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
  padding: 1rem 1.1rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  color: #64748b;
  border: 1px solid #e2e8f0;
  margin-bottom: 1rem;
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

.section-card {
  background: white;
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  padding: 1.2rem;
  margin-bottom: 1rem;
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

.empty-box {
  padding: 1.2rem;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
  text-align: center;
  background: #fbfdff;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ranking-item {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  border: 1px solid #edf2f7;
  background: #fbfcfe;
  border-radius: 12px;
}

.rank-index {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #eef2ff;
  color: #1d4ed8;
  font-weight: 700;
}

.rank-main {
  min-width: 0;
}

.rank-name {
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
  word-break: break-word;
}

.rank-meta {
  color: #64748b;
  font-size: 0.84rem;
  margin-top: 0.2rem;
}

.rank-score {
  color: #0f172a;
  font-size: 0.92rem;
  font-weight: 700;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.data-table th,
.data-table td {
  padding: 0.85rem 0.9rem;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
  font-size: 0.9rem;
}

.data-table th {
  color: #475569;
  background: #f8fafc;
  font-weight: 600;
}

.data-table td {
  color: #0f172a;
}

.admin-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 1rem;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-item {
  width: 100%;
  text-align: left;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  padding: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.user-item:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.user-item.active {
  background: #eef2ff;
  border-color: #bfdbfe;
}

.user-item-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0f172a;
}

.user-item-meta {
  margin-top: 0.25rem;
  font-size: 0.82rem;
  color: #64748b;
}

.editor-panel {
  min-width: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-field.full {
  grid-column: 1 / -1;
}

.form-field span {
  font-size: 0.88rem;
  color: #334155;
  font-weight: 600;
}

.field-input,
.field-textarea {
  width: 100%;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: white;
  color: #0f172a;
  outline: none;
}

.field-input {
  height: 44px;
  padding: 0 0.9rem;
}

.field-textarea {
  min-height: 120px;
  padding: 0.8rem 0.9rem;
  resize: vertical;
  line-height: 1.7;
}

.field-input.readonly {
  background: #f8fafc;
  color: #64748b;
}

.multi-select {
  min-height: 120px;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.primary-btn {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid #dbe4ee;
  background: white;
  color: #2563eb;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.primary-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>