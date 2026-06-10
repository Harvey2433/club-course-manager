import { readonly, ref } from 'vue'
import {
  apiCreateClub,
  apiCreateCourse,
  apiDeleteClub,
  apiDeleteCourse,
  apiEnrollCourse,
  apiListClubs,
  apiListCourses,
  apiListEnrollmentViews,
  apiListRanking,
  apiRemoveCourseResult,
  apiUpdateClub,
  apiUpdateCourse,
  apiUploadCourseResult,
  type Club,
  type Course,
  type EnrollmentView,
  type RankingEntry
} from '../../api/backend'
import { readToken } from '../../api/session'
import type {
  CreateClubPayload,
  CreateCoursePayload,
  RemoveCourseResultPayload,
  UpdateClubPayload,
  UpdateCoursePayload,
  UploadCourseResultPayload
} from './types'

const clubs = ref<Club[]>([])
const courses = ref<Course[]>([])
const enrollmentViews = ref<EnrollmentView[]>([])
const rankingEntries = ref<RankingEntry[]>([])
const version = ref(0)
const initialized = ref(false)
const actionLoading = ref(false)
const lastError = ref('')

function normalizeErrorMessage(error: unknown) {
  if (typeof error === 'string' && error) {
    return error
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '数据操作失败'
}

function requireToken() {
  const token = readToken()
  if (!token) {
    throw new Error('当前未登录，请先登录')
  }
  return token
}

async function refreshAll() {
  const token = readToken()

  if (!token) {
    clubs.value = []
    courses.value = []
    enrollmentViews.value = []
    rankingEntries.value = []
    version.value += 1
    return
  }

  const [clubList, courseList, views, ranking] = await Promise.all([
    apiListClubs(token),
    apiListCourses(token),
    apiListEnrollmentViews(token),
    apiListRanking(token)
  ])

  clubs.value = clubList
  courses.value = courseList
  enrollmentViews.value = views
  rankingEntries.value = ranking
  version.value += 1
}

export function useAppData() {
  async function initialize() {
    try {
      await refreshAll()
      lastError.value = ''
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
    } finally {
      initialized.value = true
    }
  }

  async function reload() {
    try {
      await refreshAll()
      lastError.value = ''
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
    }
  }

  async function runAction<T>(executor: (token: string) => Promise<T>): Promise<T> {
    actionLoading.value = true
    lastError.value = ''

    try {
      const token = requireToken()
      const result = await executor(token)
      await refreshAll()
      return result
    } catch (error) {
      lastError.value = normalizeErrorMessage(error)
      throw new Error(lastError.value)
    } finally {
      actionLoading.value = false
    }
  }

  return {
    initialize,
    reload,
    initialized: readonly(initialized),
    clubs: readonly(clubs),
    courses: readonly(courses),
    enrollmentViews: readonly(enrollmentViews),
    rankingEntries: readonly(rankingEntries),
    version: readonly(version),
    actionLoading: readonly(actionLoading),
    lastError: readonly(lastError),

    createClub: (payload: CreateClubPayload) =>
      runAction((token) => apiCreateClub(token, payload)),

    updateClub: (payload: UpdateClubPayload) =>
      runAction((token) => apiUpdateClub(token, payload)),

    deleteClub: (clubId: string) =>
      runAction((token) => apiDeleteClub(token, clubId)),

    createCourse: (payload: CreateCoursePayload) =>
      runAction((token) => apiCreateCourse(token, payload)),

    updateCourse: (payload: UpdateCoursePayload) =>
      runAction((token) => apiUpdateCourse(token, payload)),

    deleteCourse: (courseId: string) =>
      runAction((token) => apiDeleteCourse(token, courseId)),

    uploadCourseResult: (payload: UploadCourseResultPayload) =>
      runAction((token) => apiUploadCourseResult(token, payload)),

    removeCourseResult: (payload: RemoveCourseResultPayload) =>
      runAction((token) => apiRemoveCourseResult(token, payload.courseId)),

    createEnrollment: (courseId: string) =>
      runAction((token) => apiEnrollCourse(token, courseId))
  }
}