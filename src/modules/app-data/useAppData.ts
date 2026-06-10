// src/modules/app-data/useAppData.ts
import { computed, readonly, ref } from 'vue'
import type { AccountUser } from '../account/types'
import {
  buildRankingEntries,
  buildVisibleEnrollmentRecords,
  createClub,
  createCourse,
  createEnrollment,
  deleteClub,
  deleteCourse,
  removeCourseResult,
  updateClub,
  updateCourse,
  uploadCourseResult
} from './service'
import { readAppData, writeAppData } from './storage'
import type {
  AppDataSnapshot,
  CreateClubPayload,
  CreateCoursePayload,
  RemoveCourseResultPayload,
  UpdateClubPayload,
  UpdateCoursePayload,
  UploadCourseResultPayload
} from './types'

const clubs = ref<AppDataSnapshot['clubs']>([])
const courses = ref<AppDataSnapshot['courses']>([])
const enrollments = ref<AppDataSnapshot['enrollments']>([])
const version = ref(0)
const initialized = ref(false)
const actionLoading = ref(false)
const lastError = ref('')

function applySnapshot(snapshot: AppDataSnapshot) {
  clubs.value = snapshot.clubs
  courses.value = snapshot.courses
  enrollments.value = snapshot.enrollments
  version.value += 1
  writeAppData(snapshot)
}

function getSnapshot(): AppDataSnapshot {
  return {
    clubs: [...clubs.value],
    courses: [...courses.value],
    enrollments: [...enrollments.value]
  }
}

export function useAppData() {
  async function initialize() {
    const snapshot = readAppData()
    clubs.value = snapshot.clubs
    courses.value = snapshot.courses
    enrollments.value = snapshot.enrollments
    initialized.value = true
    version.value += 1
  }

  async function runAction(executor: () => AppDataSnapshot) {
    actionLoading.value = true
    lastError.value = ''

    try {
      const snapshot = executor()
      applySnapshot(snapshot)
      return snapshot
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '数据操作失败'
      throw error
    } finally {
      actionLoading.value = false
    }
  }

  return {
    initialize,
    initialized: readonly(initialized),
    clubs: readonly(clubs),
    courses: readonly(courses),
    enrollments: readonly(enrollments),
    version: readonly(version),
    actionLoading: readonly(actionLoading),
    lastError: readonly(lastError),

    createClub: (currentUser: AccountUser | null, payload: CreateClubPayload) =>
      runAction(() => createClub(currentUser, getSnapshot(), payload)),

    updateClub: (currentUser: AccountUser | null, payload: UpdateClubPayload) =>
      runAction(() => updateClub(currentUser, getSnapshot(), payload)),

    deleteClub: (currentUser: AccountUser | null, clubId: string) =>
      runAction(() => deleteClub(currentUser, getSnapshot(), clubId)),

    createCourse: (currentUser: AccountUser | null, payload: CreateCoursePayload) =>
      runAction(() => createCourse(currentUser, getSnapshot(), payload)),

    updateCourse: (currentUser: AccountUser | null, payload: UpdateCoursePayload) =>
      runAction(() => updateCourse(currentUser, getSnapshot(), payload)),

    deleteCourse: (currentUser: AccountUser | null, courseId: string) =>
      runAction(() => deleteCourse(currentUser, getSnapshot(), courseId)),

    uploadCourseResult: (
      currentUser: AccountUser | null,
      payload: UploadCourseResultPayload
    ) => runAction(() => uploadCourseResult(currentUser, getSnapshot(), payload)),

    removeCourseResult: (
      currentUser: AccountUser | null,
      payload: RemoveCourseResultPayload
    ) => runAction(() => removeCourseResult(currentUser, getSnapshot(), payload)),

    createEnrollment: (currentUser: AccountUser | null, courseId: string) =>
      runAction(() => createEnrollment(currentUser, getSnapshot(), courseId)),

    buildVisibleEnrollmentRecords: (currentUser: AccountUser | null, accounts: AccountUser[]) =>
      buildVisibleEnrollmentRecords(currentUser, getSnapshot(), accounts),

    buildRankingEntries: (currentUser: AccountUser | null, accounts: AccountUser[]) =>
      buildRankingEntries(currentUser, getSnapshot(), accounts),

    snapshot: computed(() => getSnapshot())
  }
}