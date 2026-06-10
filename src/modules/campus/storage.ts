import type { Club, Course, EnrollmentRecord } from './types'

export const CLUBS_STORAGE_KEY = 'club-course-manager.clubs.v1'
export const COURSES_STORAGE_KEY = 'club-course-manager.courses.v1'
export const ENROLLMENTS_STORAGE_KEY = 'club-course-manager.enrollments.v1'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeClub(value: unknown): Club | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

function normalizeCourse(value: unknown): Course | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.clubId !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.teacherName !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    clubId: value.clubId,
    name: value.name,
    teacherName: value.teacherName,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

function normalizeEnrollment(value: unknown): EnrollmentRecord | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.courseId !== 'string' ||
    typeof value.studentId !== 'string' ||
    typeof value.createdAt !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    courseId: value.courseId,
    studentId: value.studentId,
    createdAt: value.createdAt
  }
}

export function readClubs(): Club[] {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const parsed = safeParseJson(storage.getItem(CLUBS_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((item) => normalizeClub(item))
    .filter((item): item is Club => item !== null)
}

export function writeClubs(clubs: Club[]) {
  const storage = getStorage()
  if (!storage) {
    throw new Error('当前环境不支持社团数据存储')
  }

  storage.setItem(CLUBS_STORAGE_KEY, JSON.stringify(clubs))
}

export function readCourses(): Course[] {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const parsed = safeParseJson(storage.getItem(COURSES_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((item) => normalizeCourse(item))
    .filter((item): item is Course => item !== null)
}

export function writeCourses(courses: Course[]) {
  const storage = getStorage()
  if (!storage) {
    throw new Error('当前环境不支持课程数据存储')
  }

  storage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses))
}

export function readEnrollments(): EnrollmentRecord[] {
  const storage = getStorage()
  if (!storage) {
    return []
  }

  const parsed = safeParseJson(storage.getItem(ENROLLMENTS_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed
    .map((item) => normalizeEnrollment(item))
    .filter((item): item is EnrollmentRecord => item !== null)
}

export function writeEnrollments(enrollments: EnrollmentRecord[]) {
  const storage = getStorage()
  if (!storage) {
    throw new Error('当前环境不支持选课数据存储')
  }

  storage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify(enrollments))
}