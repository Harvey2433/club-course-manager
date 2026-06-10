<!-- src/views/Courses.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAccount } from '../modules/account/useAccount'
import { useAppData } from '../modules/app-data/useAppData'
import type { Course } from '../modules/app-data/types'

const { currentUser, initialized: accountInitialized } = useAccount()

const {
  clubs,
  courses,
  enrollments,
  actionLoading,
  lastError,
  createCourse,
  updateCourse,
  deleteCourse,
  createEnrollment,
  uploadCourseResult,
  removeCourseResult
} = useAppData()

const localError = ref('')
const localMessage = ref('')
const editingCourseId = ref('')
const uploadingCourseId = ref('')

const form = reactive({
  clubId: '',
  name: '',
  teacherName: '',
  description: ''
})

const canManageAnyCourse = computed(() => {
  return currentUser.value?.role === 'admin' || currentUser.value?.role === 'teacher'
})

const manageableClubs = computed(() => {
  if (currentUser.value?.role === 'admin') {
    return [...clubs.value]
  }

  if (currentUser.value?.role === 'teacher') {
    return clubs.value.filter((club) => currentUser.value?.managedClubIds.includes(club.id))
  }

  return []
})

const selectedCourseIdSet = computed(() => {
  if (!currentUser.value) {
    return new Set<string>()
  }

  return new Set(
    enrollments.value
      .filter((item) => item.studentUserId === currentUser.value?.id)
      .map((item) => item.courseId)
  )
})

const visibleCourses = computed(() => {
  return [...courses.value]
    .map((course) => ({
      ...course,
      clubName: clubs.value.find((club) => club.id === course.clubId)?.name || '未知社团'
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
})

function resetMessages() {
  localError.value = ''
  localMessage.value = ''
}

function resetForm() {
  form.clubId = manageableClubs.value[0]?.id || ''
  form.name = ''
  form.teacherName = ''
  form.description = ''
  editingCourseId.value = ''
}

function canManageCourse(course: Course) {
  if (currentUser.value?.role === 'admin') {
    return true
  }

  if (currentUser.value?.role === 'teacher') {
    return currentUser.value.managedClubIds.includes(course.clubId)
  }

  return false
}

function canSelectCourse(course: Course) {
  if (!currentUser.value) {
    return true
  }

  if (currentUser.value.role !== 'student') {
    return false
  }

  return !selectedCourseIdSet.value.has(course.id)
}

async function handleSubmitCourse() {
  if (!canManageAnyCourse.value) {
    return
  }

  resetMessages()

  try {
    if (editingCourseId.value) {
      await updateCourse(currentUser.value, {
        id: editingCourseId.value,
        clubId: form.clubId,
        name: form.name,
        teacherName: form.teacherName,
        description: form.description
      })
      localMessage.value = '课程信息已更新'
    } else {
      await createCourse(currentUser.value, {
        clubId: form.clubId,
        name: form.name,
        teacherName: form.teacherName,
        description: form.description
      })
      localMessage.value = '课程已创建'
    }

    resetForm()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '保存课程失败，请稍后重试'
  }
}

function handleEditCourse(course: Course) {
  if (!canManageCourse(course)) {
    return
  }

  resetMessages()
  editingCourseId.value = course.id
  form.clubId = course.clubId
  form.name = course.name
  form.teacherName = course.teacherName
  form.description = course.description
}

async function handleDeleteCourse(course: Course) {
  if (!canManageCourse(course)) {
    return
  }

  if (!window.confirm(`确定删除课程“${course.name}”吗？`)) {
    return
  }

  resetMessages()

  try {
    await deleteCourse(currentUser.value, course.id)

    if (editingCourseId.value === course.id) {
      resetForm()
    }

    localMessage.value = '课程已删除'
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '删除课程失败，请稍后重试'
  }
}

async function handleSelectCourse(courseId: string) {
  resetMessages()

  try {
    await createEnrollment(currentUser.value, courseId)
    localMessage.value = '选课成功'
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '选课失败，请稍后重试'
  }
}

async function handleUploadResult(event: Event, course: Course) {
  if (!canManageCourse(course)) {
    return
  }

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  resetMessages()
  uploadingCourseId.value = course.id

  try {
    const dataUrl = await readFileAsDataUrl(file)

    await uploadCourseResult(currentUser.value, {
      courseId: course.id,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataUrl
    })

    localMessage.value = '课程成果上传成功'
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '上传课程成果失败，请稍后重试'
  } finally {
    uploadingCourseId.value = ''
    input.value = ''
  }
}

async function handleRemoveResult(course: Course) {
  if (!canManageCourse(course) || !course.resultAttachment) {
    return
  }

  if (!window.confirm(`确定删除“${course.name}”的课程成果吗？`)) {
    return
  }

  resetMessages()

  try {
    await removeCourseResult(currentUser.value, {
      courseId: course.id
    })
    localMessage.value = '课程成果已删除'
  } catch (error) {
    localError.value = error instanceof Error ? error.message : '删除课程成果失败，请稍后重试'
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

watch(
  manageableClubs,
  (value) => {
    if (!value.length) {
      form.clubId = ''
      return
    }

    if (!value.some((club) => club.id === form.clubId)) {
      form.clubId = value[0].id
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="courses-page">
    <div class="page-header">
      <h3>课程管理</h3>
      <p class="page-desc">
        管理员可管理全部课程；教师可管理自己负责社团的课程；学生可浏览课程并进行选课。
      </p>
    </div>

    <div v-if="!accountInitialized" class="status-box">正在加载...</div>

    <template v-else>
      <div v-if="lastError" class="status-box error">{{ lastError }}</div>
      <div v-if="localError" class="status-box error">{{ localError }}</div>
      <div v-if="localMessage" class="status-box success">{{ localMessage }}</div>

      <section v-if="canManageAnyCourse" class="section-card">
        <div class="section-header">
          <h4>{{ editingCourseId ? '编辑课程' : '新建课程' }}</h4>
          <p>支持上传课程成果文件，文件将保存在本地数据中。</p>
        </div>

        <div class="form-grid">
          <label class="form-field">
            <span>所属社团</span>
            <select v-model="form.clubId" class="field-input">
              <option v-for="club in manageableClubs" :key="club.id" :value="club.id">
                {{ club.name }}
              </option>
            </select>
          </label>

          <label class="form-field">
            <span>课程名称</span>
            <input v-model="form.name" class="field-input" type="text" maxlength="50" />
          </label>

          <label class="form-field">
            <span>授课老师</span>
            <input v-model="form.teacherName" class="field-input" type="text" maxlength="30" />
          </label>

          <label class="form-field full">
            <span>课程简介</span>
            <textarea
              v-model="form.description"
              class="field-textarea"
              maxlength="200"
            ></textarea>
          </label>
        </div>

        <div class="button-row">
          <button
            class="primary-btn"
            type="button"
            :disabled="actionLoading"
            @click="handleSubmitCourse"
          >
            {{ actionLoading ? '保存中...' : editingCourseId ? '保存修改' : '创建课程' }}
          </button>

          <button
            v-if="editingCourseId"
            class="secondary-btn"
            type="button"
            :disabled="actionLoading"
            @click="resetForm"
          >
            取消编辑
          </button>
        </div>
      </section>

      <section class="section-card">
        <div class="section-header">
          <h4>课程列表</h4>
          <p>共 {{ visibleCourses.length }} 门课程</p>
        </div>

        <div v-if="visibleCourses.length === 0" class="empty-box">暂无课程数据</div>

        <div v-else class="course-list">
          <div v-for="course in visibleCourses" :key="course.id" class="course-card">
            <div class="course-main">
              <div class="course-top">
                <h5>{{ course.name }}</h5>
                <span class="club-tag">{{ course.clubName }}</span>
              </div>

              <div class="course-meta">授课老师：{{ course.teacherName }}</div>
              <p class="course-desc">{{ course.description }}</p>

              <div class="result-box">
                <div class="result-header">
                  <strong>课程成果</strong>
                </div>

                <template v-if="course.resultAttachment">
                  <div class="result-file">
                    <a :href="course.resultAttachment.dataUrl" :download="course.resultAttachment.fileName">
                      {{ course.resultAttachment.fileName }}
                    </a>
                    <span class="result-time">
                      上传时间：{{ new Date(course.resultAttachment.uploadedAt).toLocaleString() }}
                    </span>
                  </div>
                </template>
                <div v-else class="result-empty">暂无课程成果</div>
              </div>
            </div>

            <div class="course-actions">
              <template v-if="canManageCourse(course)">
                <label class="upload-btn">
                  {{ uploadingCourseId === course.id ? '上传中...' : '上传课程成果' }}
                  <input
                    type="file"
                    hidden
                    :disabled="actionLoading || uploadingCourseId === course.id"
                    @change="handleUploadResult($event, course)"
                  />
                </label>

                <button
                  class="secondary-btn"
                  type="button"
                  :disabled="actionLoading"
                  @click="handleEditCourse(course)"
                >
                  编辑
                </button>

                <button
                  v-if="course.resultAttachment"
                  class="secondary-btn danger-light"
                  type="button"
                  :disabled="actionLoading"
                  @click="handleRemoveResult(course)"
                >
                  删除成果
                </button>

                <button
                  class="danger-btn"
                  type="button"
                  :disabled="actionLoading"
                  @click="handleDeleteCourse(course)"
                >
                  删除课程
                </button>
              </template>

              <template v-else>
                <button
                  v-if="currentUser?.role === 'student'"
                  class="primary-btn"
                  type="button"
                  :disabled="actionLoading || !canSelectCourse(course)"
                  @click="handleSelectCourse(course.id)"
                >
                  {{ canSelectCourse(course) ? '立即选课' : '已选课' }}
                </button>

                <div v-else class="result-empty">仅学生可选课</div>
              </template>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.courses-page {
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

.button-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.primary-btn,
.secondary-btn,
.danger-btn,
.upload-btn {
  min-height: 42px;
  padding: 0 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  border: 1px solid #dbe4ee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.primary-btn,
.upload-btn {
  background: white;
  color: #2563eb;
}

.secondary-btn {
  background: #f8fafc;
  color: #334155;
}

.danger-btn {
  background: #fff5f5;
  color: #b91c1c;
  border-color: #fecaca;
}

.danger-light {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.primary-btn:hover:not(:disabled),
.secondary-btn:hover:not(:disabled),
.danger-btn:hover:not(:disabled),
.upload-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.danger-btn:disabled,
.upload-btn:has(input:disabled) {
  opacity: 0.65;
  cursor: not-allowed;
}

.empty-box {
  padding: 1.2rem;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
  text-align: center;
  background: #fbfdff;
}

.course-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.course-card {
  border: 1px solid #e8ecf1;
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  background: #fbfdff;
}

.course-main {
  min-width: 0;
  flex: 1;
}

.course-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.course-top h5 {
  font-size: 1rem;
  color: #0f172a;
  font-weight: 600;
}

.club-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #1d4ed8;
  font-size: 0.8rem;
  font-weight: 600;
}

.course-meta {
  margin-top: 0.5rem;
  color: #475569;
  font-size: 0.88rem;
}

.course-desc {
  margin-top: 0.6rem;
  color: #334155;
  line-height: 1.7;
  font-size: 0.9rem;
}

.result-box {
  margin-top: 0.9rem;
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
}

.result-header {
  color: #0f172a;
  font-size: 0.88rem;
  margin-bottom: 0.45rem;
}

.result-file {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.result-file a {
  color: #2563eb;
  text-decoration: none;
  word-break: break-all;
}

.result-time,
.result-empty {
  color: #64748b;
  font-size: 0.82rem;
}

.course-actions {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 148px;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .course-card {
    flex-direction: column;
  }

  .course-actions {
    min-width: 0;
  }
}
</style>