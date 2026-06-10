import type { Club, Course, EnrollmentRecord } from './types'

export const CLUB_STORAGE_KEY = 'club-course-manager.clubs.v1'
export const COURSE_STORAGE_KEY = 'club-course-manager.courses.v1'
export const ENROLLMENT_STORAGE_KEY = 'club-course-manager.enrollments.v1'

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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
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
    updatedAt: value.updatedAt,
    managerUserIds: normalizeStringArray(value.managerUserIds)
  }
}

function normalizeCourse(value: unknown): Course | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.clubId !== 'string' ||
    typeof value.clubName !== 'string' ||
    typeof value.teacherId !== 'string' ||
    typeof value.teacherName !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    clubId: value.clubId,
    clubName: value.clubName,
    teacherId: value.teacherId,
    teacherName: value.teacherName,
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
    typeof value.studentId !== 'string' ||
    typeof value.studentName !== 'string' ||
    typeof value.courseId !== 'string' ||
    typeof value.courseName !== 'string' ||
    typeof value.clubId !== 'string' ||
    typeof value.clubName !== 'string' ||
    typeof value.createdAt !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    studentId: value.studentId,
    studentName: value.studentName,
    courseId: value.courseId,
    courseName: value.courseName,
    clubId: value.clubId,
    clubName: value.clubName,
    createdAt: value.createdAt
  }
}

export function readClubs() {
  const storage = getStorage()
  if (!storage) {
    return [] as Club[]
  }

  const parsed = safeParseJson(storage.getItem(CLUB_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return [] as Club[]
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

  storage.setItem(CLUB_STORAGE_KEY, JSON.stringify(clubs))
}

export function readCourses() {
  const storage = getStorage()
  if (!storage) {
    return [] as Course[]
  }

  const parsed = safeParseJson(storage.getItem(COURSE_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return [] as Course[]
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

  storage.setItem(COURSE_STORAGE_KEY, JSON.stringify(courses))
}

export function readEnrollments() {
  const storage = getStorage()
  if (!storage) {
    return [] as EnrollmentRecord[]
  }

  const parsed = safeParseJson(storage.getItem(ENROLLMENT_STORAGE_KEY))
  if (!Array.isArray(parsed)) {
    return [] as EnrollmentRecord[]
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

  storage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(enrollments))
}