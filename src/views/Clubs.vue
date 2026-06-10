<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAccount } from '../modules/account/useAccount'
import { useAppData } from '../modules/app-data/useAppData'

const {
  initialize: initializeAccount,
  currentUser,
  initialized: accountInitialized
} = useAccount()

const {
  initialize: initializeData,
  clubs,
  actionLoading,
  lastError,
  createClub,
  updateClub,
  deleteClub
} = useAppData()

const localMessage = ref('')
const localError = ref('')
const editingClubId = ref('')

const clubForm = reactive({
  name: '',
  description: ''
})

const isAdmin = computed(() => currentUser.value?.role === 'admin')
const canCreateClub = computed(() => isAdmin.value)

const managedClubIds = computed(() => currentUser.value?.managedClubIds || [])

const sortedClubs = computed(() => {
  return [...clubs.value].sort((a, b) => b.updatedAt - a.updatedAt)
})

function resetForm() {
  clubForm.name = ''
  clubForm.description = ''
  editingClubId.value = ''
}

function fillFormByClub(clubId: string) {
  const target = clubs.value.find((item) => item.id === clubId)
  if (!target) {
    return
  }

  editingClubId.value = clubId
  clubForm.name = target.name
  clubForm.description = target.description
}

function canEditClub(clubId: string) {
  if (!currentUser.value) {
    return false
  }

  if (currentUser.value.role === 'admin') {
    return true
  }

  if (currentUser.value.role === 'teacher') {
    return currentUser.value.managedClubIds.includes(clubId)
  }

  return false
}

async function handleSubmitClub() {
  localError.value = ''
  localMessage.value = ''

  try {
    if (editingClubId.value) {
      await updateClub({
        id: editingClubId.value,
        name: clubForm.name,
        description: clubForm.description
      })
      localMessage.value = '社团已更新'
    } else {
      await createClub({
        name: clubForm.name,
        description: clubForm.description
      })
      localMessage.value = '社团已创建'
    }

    resetForm()
  } catch (error) {
    localError.value =
      error instanceof Error ? error.message : '社团操作失败，请稍后重试'
  }
}

async function handleDeleteClub(clubId: string) {
  localError.value = ''
  localMessage.value = ''

  const confirmed = window.confirm('删除社团将同步删除其下课程和选课记录，确定继续吗？')
  if (!confirmed) {
    return
  }

  try {
    await deleteClub(clubId)

    if (editingClubId.value === clubId) {
      resetForm()
    }

    localMessage.value = '社团已删除'
  } catch (error) {
    localError.value =
      error instanceof Error ? error.message : '删除社团失败，请稍后重试'
  }
}

onMounted(async () => {
  await initializeAccount()
  await initializeData()
})
</script>

<template>
  <div class="clubs-page">
    <div class="page-header">
      <h3>社团管理</h3>
      <p class="page-desc">
        管理社团区域。管理员可新增社团，教师仅可管理管理员分配给自己的区域。
      </p>
    </div>

    <div v-if="!accountInitialized" class="status-box">正在初始化...</div>

    <template v-else>
      <div v-if="lastError" class="status-box error">{{ lastError }}</div>
      <div v-if="localError" class="status-box error">{{ localError }}</div>
      <div v-if="localMessage" class="status-box success">{{ localMessage }}</div>

      <section v-if="canCreateClub || editingClubId" class="editor-card">
        <div class="editor-header">
          <h4>{{ editingClubId ? '编辑社团' : '新建社团' }}</h4>
          <button
            v-if="editingClubId"
            class="text-btn"
            type="button"
            :disabled="actionLoading"
            @click="resetForm"
          >
            取消编辑
          </button>
        </div>

        <div class="form-grid">
          <label class="form-field">
            <span>社团名称</span>
            <input
              v-model="clubForm.name"
              class="field-input"
              type="text"
              maxlength="40"
              :disabled="actionLoading"
              placeholder="请输入社团名称"
            />
          </label>

          <label class="form-field full">
            <span>社团简介</span>
            <textarea
              v-model="clubForm.description"
              class="field-textarea"
              maxlength="300"
              :disabled="actionLoading"
              placeholder="请输入社团简介"
            ></textarea>
          </label>
        </div>

        <div class="button-row">
          <button
            class="primary-btn"
            type="button"
            :disabled="actionLoading"
            @click="handleSubmitClub"
          >
            {{ actionLoading ? '提交中...' : editingClubId ? '保存社团' : '创建社团' }}
          </button>
        </div>
      </section>

      <section v-if="currentUser?.role === 'teacher'" class="hint-card">
        <h4>我的管理区域</h4>
        <p v-if="managedClubIds.length === 0" class="muted">
          管理员暂未为你分配社团区域。
        </p>
        <div v-else class="tag-row">
          <span
            v-for="club in sortedClubs.filter((item) => managedClubIds.includes(item.id))"
            :key="club.id"
            class="tag"
          >
            {{ club.name }}
          </span>
        </div>
      </section>

      <div v-if="sortedClubs.length === 0" class="status-box">暂无社团</div>

      <div v-else class="club-grid">
        <article
          v-for="club in sortedClubs"
          :key="club.id"
          class="club-card"
        >
          <div class="club-top">
            <h4>{{ club.name }}</h4>
            <span v-if="canEditClub(club.id)" class="badge editable">可管理</span>
            <span v-else class="badge">只读</span>
          </div>

          <p class="club-description">
            {{ club.description || '暂无简介' }}
          </p>

          <div class="club-meta">
            <span>更新时间：{{ new Date(club.updatedAt).toLocaleString() }}</span>
          </div>

          <div v-if="canEditClub(club.id)" class="button-row">
            <button
              class="ghost-btn"
              type="button"
              :disabled="actionLoading"
              @click="fillFormByClub(club.id)"
            >
              编辑
            </button>

            <button
              v-if="isAdmin"
              class="ghost-btn danger"
              type="button"
              :disabled="actionLoading"
              @click="handleDeleteClub(club.id)"
            >
              删除
            </button>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.clubs-page {
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

.editor-card,
.hint-card,
.club-card {
  background: white;
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.editor-card,
.hint-card {
  padding: 1.2rem;
  margin-bottom: 1rem;
}

.editor-header,
.club-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.editor-header h4,
.hint-card h4,
.club-top h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
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

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.primary-btn,
.ghost-btn,
.text-btn {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn,
.ghost-btn {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid #dbe4ee;
  background: white;
  font-weight: 600;
}

.primary-btn {
  color: #2563eb;
}

.ghost-btn {
  color: #334155;
}

.ghost-btn.danger {
  color: #b91c1c;
}

.text-btn {
  border: none;
  background: transparent;
  color: #64748b;
  padding: 0.25rem 0;
}

.primary-btn:hover:not(:disabled),
.ghost-btn:hover:not(:disabled),
.text-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.primary-btn:disabled,
.ghost-btn:disabled,
.text-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.club-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.club-card {
  padding: 1.2rem;
}

.club-description {
  color: #64748b;
  line-height: 1.7;
  font-size: 0.9rem;
  margin-top: 0.85rem;
  min-height: 76px;
  white-space: pre-wrap;
  word-break: break-word;
}

.club-meta {
  margin-top: 0.9rem;
  color: #94a3b8;
  font-size: 0.82rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
}

.badge.editable {
  background: #eef2ff;
  color: #1d4ed8;
}

.tag-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.8rem;
}

.tag {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #1d4ed8;
  font-size: 0.85rem;
}

.muted {
  margin-top: 0.6rem;
  color: #64748b;
  font-size: 0.9rem;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>