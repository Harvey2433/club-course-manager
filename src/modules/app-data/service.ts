// src/modules/app-data/service.ts
import type { AccountUser } from '../account/types'
import type {
  AppDataSnapshot,
  Club,
  Course,
  CreateClubPayload,
  CreateCoursePayload,
  EnrollmentRecord,
  RemoveCourseResultPayload,
  UpdateClubPayload,
  UpdateCoursePayload,
  UploadCourseResultPayload
} from './types'

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function assertText(value: string, label: string, min = 1, max = 120) {
  const text = value.trim()

  if (text.length < min) {
    throw new Error(`${label}不能为空`)
  }

  if (text.length > max) {
    throw new Error(`${label}长度不能超过${max}个字符`)
  }

  return text
}

export function canManageClub(user: AccountUser | null, clubId: string) {
  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'teacher' && user.managedClubIds.includes(clubId)) {
    return true
  }

  return false
}

function ensureManagePermission(user: AccountUser | null, clubId: string) {
  if (!user) {
    throw new Error('请先登录')
  }

  if (canManageClub(user, clubId)) {
    return
  }

  throw new Error('当前用户无权管理该社团或课程')
}

export function createClub(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: CreateClubPayload
): AppDataSnapshot {
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('仅管理员可创建社团')
  }

  const now = Date.now()
  const club: Club = {
    id: createId('club'),
    name: assertText(payload.name, '社团名称', 1, 40),
    description: assertText(payload.description, '社团简介', 1, 200),
    createdAt: now,
    updatedAt: now
  }

  return {
    ...snapshot,
    clubs: [...snapshot.clubs, club]
  }
}

export function updateClub(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: UpdateClubPayload
): AppDataSnapshot {
  const target = snapshot.clubs.find((item) => item.id === payload.id)

  if (!target) {
    throw new Error('社团不存在')
  }

  ensureManagePermission(currentUser, target.id)

  return {
    ...snapshot,
    clubs: snapshot.clubs.map((item) =>
      item.id === payload.id
        ? {
            ...item,
            name: assertText(payload.name, '社团名称', 1, 40),
            description: assertText(payload.description, '社团简介', 1, 200),
            updatedAt: Date.now()
          }
        : item
    )
  }
}

export function deleteClub(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  clubId: string
): AppDataSnapshot {
  const target = snapshot.clubs.find((item) => item.id === clubId)

  if (!target) {
    throw new Error('社团不存在')
  }

  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('仅管理员可删除社团')
  }

  const courseIds = snapshot.courses.filter((item) => item.clubId === clubId).map((item) => item.id)

  return {
    clubs: snapshot.clubs.filter((item) => item.id !== clubId),
    courses: snapshot.courses.filter((item) => item.clubId !== clubId),
    enrollments: snapshot.enrollments.filter((item) => !courseIds.includes(item.courseId))
  }
}

export function createCourse(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: CreateCoursePayload
): AppDataSnapshot {
  ensureManagePermission(currentUser, payload.clubId)

  const club = snapshot.clubs.find((item) => item.id === payload.clubId)

  if (!club) {
    throw new Error('所属社团不存在')
  }

  const now = Date.now()
  const course: Course = {
    id: createId('course'),
    clubId: payload.clubId,
    name: assertText(payload.name, '课程名称', 1, 50),
    teacherName: assertText(payload.teacherName, '授课老师', 1, 30),
    description: assertText(payload.description, '课程简介', 1, 200),
    resultAttachment: null,
    createdAt: now,
    updatedAt: now
  }

  return {
    ...snapshot,
    courses: [...snapshot.courses, course]
  }
}

export function updateCourse(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: UpdateCoursePayload
): AppDataSnapshot {
  const target = snapshot.courses.find((item) => item.id === payload.id)

  if (!target) {
    throw new Error('课程不存在')
  }

  ensureManagePermission(currentUser, target.clubId)
  ensureManagePermission(currentUser, payload.clubId)

  const club = snapshot.clubs.find((item) => item.id === payload.clubId)

  if (!club) {
    throw new Error('所属社团不存在')
  }

  return {
    ...snapshot,
    courses: snapshot.courses.map((item) =>
      item.id === payload.id
        ? {
            ...item,
            clubId: payload.clubId,
            name: assertText(payload.name, '课程名称', 1, 50),
            teacherName: assertText(payload.teacherName, '授课老师', 1, 30),
            description: assertText(payload.description, '课程简介', 1, 200),
            updatedAt: Date.now()
          }
        : item
    )
  }
}

export function deleteCourse(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  courseId: string
): AppDataSnapshot {
  const target = snapshot.courses.find((item) => item.id === courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  ensureManagePermission(currentUser, target.clubId)

  return {
    clubs: snapshot.clubs,
    courses: snapshot.courses.filter((item) => item.id !== courseId),
    enrollments: snapshot.enrollments.filter((item) => item.courseId !== courseId)
  }
}

export function uploadCourseResult(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: UploadCourseResultPayload
): AppDataSnapshot {
  const target = snapshot.courses.find((item) => item.id === payload.courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  ensureManagePermission(currentUser, target.clubId)

  const fileName = assertText(payload.fileName, '文件名', 1, 120)
  const mimeType = payload.mimeType.trim()
  const dataUrl = payload.dataUrl.trim()

  if (!dataUrl.startsWith('data:')) {
    throw new Error('上传文件数据无效')
  }

  return {
    ...snapshot,
    courses: snapshot.courses.map((item) =>
      item.id === payload.courseId
        ? {
            ...item,
            resultAttachment: {
              fileName,
              mimeType,
              dataUrl,
              uploadedAt: Date.now()
            },
            updatedAt: Date.now()
          }
        : item
    )
  }
}

export function removeCourseResult(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  payload: RemoveCourseResultPayload
): AppDataSnapshot {
  const target = snapshot.courses.find((item) => item.id === payload.courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  ensureManagePermission(currentUser, target.clubId)

  return {
    ...snapshot,
    courses: snapshot.courses.map((item) =>
      item.id === payload.courseId
        ? {
            ...item,
            resultAttachment: null,
            updatedAt: Date.now()
          }
        : item
    )
  }
}

export function createEnrollment(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  courseId: string
): AppDataSnapshot {
  if (!currentUser) {
    throw new Error('请先登录')
  }

  const target = snapshot.courses.find((item) => item.id === courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  const exists = snapshot.enrollments.some(
    (item) => item.courseId === courseId && item.studentUserId === currentUser.id
  )

  if (exists) {
    throw new Error('你已选择该课程，请勿重复选课')
  }

  const record: EnrollmentRecord = {
    id: createId('enrollment'),
    courseId,
    studentUserId: currentUser.id,
    createdAt: Date.now()
  }

  return {
    ...snapshot,
    enrollments: [...snapshot.enrollments, record]
  }
}

export function buildVisibleEnrollmentRecords(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  accounts: AccountUser[]
) {
  const accountMap = new Map(accounts.map((item) => [item.id, item]))
  const courseMap = new Map(snapshot.courses.map((item) => [item.id, item]))
  const clubMap = new Map(snapshot.clubs.map((item) => [item.id, item]))

  return snapshot.enrollments
    .filter((record) => {
      if (!currentUser) {
        return false
      }

      if (currentUser.role === 'admin') {
        return true
      }

      if (currentUser.role === 'student') {
        return record.studentUserId === currentUser.id
      }

      const course = courseMap.get(record.courseId)
      return !!course && currentUser.managedClubIds.includes(course.clubId)
    })
    .map((record) => {
      const student = accountMap.get(record.studentUserId)
      const course = courseMap.get(record.courseId)
      const club = course ? clubMap.get(course.clubId) : null

      return {
        id: record.id,
        studentUserId: record.studentUserId,
        studentDisplayName: student?.displayName || '未知用户',
        studentUsername: student?.username || 'unknown',
        studentRole: student?.role || 'student',
        courseId: record.courseId,
        courseName: course?.name || '未知课程',
        clubName: club?.name || '未知社团',
        teacherName: course?.teacherName || '未知教师',
        createdAt: record.createdAt
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function buildRankingEntries(
  currentUser: AccountUser | null,
  snapshot: AppDataSnapshot,
  accounts: AccountUser[]
) {
  const visibleRecords = buildVisibleEnrollmentRecords(currentUser, snapshot, accounts)
  const countMap = new Map<string, number>()

  visibleRecords.forEach((item) => {
    countMap.set(item.studentUserId, (countMap.get(item.studentUserId) || 0) + 1)
  })

  return accounts
    .filter((account) => countMap.has(account.id))
    .map((account) => ({
      userId: account.id,
      username: account.username,
      displayName: account.displayName,
      role: account.role,
      enrolledCount: countMap.get(account.id) || 0
    }))
    .sort((a, b) => b.enrolledCount - a.enrolledCount)
}