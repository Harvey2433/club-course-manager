import { createAccountId } from '../account/security'
import { readAccounts } from '../account/storage'
import type { AccountUser, StoredAccount } from '../account/types'
import {
  readClubs,
  readCourses,
  readEnrollments,
  writeClubs,
  writeCourses,
  writeEnrollments
} from './storage'
import type {
  Club,
  Course,
  EnrollmentRecord,
  EnrollmentView,
  LeaderboardEntry
} from './types'

function sanitizeRequiredText(value: string, label: string, maxLength: number) {
  const normalized = String(value || '').trim().replace(/\s{2,}/g, ' ')
  if (!normalized) {
    throw new Error(`${label}不能为空`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  }

  return normalized
}

function sanitizeOptionalText(value: string, maxLength: number) {
  const normalized = String(value || '').trim().replace(/\s{2,}/g, ' ')
  if (normalized.length > maxLength) {
    throw new Error(`内容不能超过 ${maxLength} 个字符`)
  }

  return normalized
}

function getLatestActor(user: AccountUser | null) {
  if (!user) {
    return null
  }

  const accounts = readAccounts()
  return accounts.find((item) => item.id === user.id) || null
}

function isAdmin(user: StoredAccount | AccountUser | null) {
  return user?.role === 'admin'
}

function isTeacher(user: StoredAccount | AccountUser | null) {
  return user?.role === 'teacher'
}

export function canManageClub(user: AccountUser | null, clubId: string) {
  const actor = getLatestActor(user)

  if (!actor) {
    return false
  }

  if (isAdmin(actor)) {
    return true
  }

  return isTeacher(actor) && actor.managedClubIds.includes(clubId)
}

export function canManageCourse(user: AccountUser | null, course: Course) {
  return canManageClub(user, course.clubId)
}

export function canCreateClub(user: AccountUser | null) {
  const actor = getLatestActor(user)
  return isAdmin(actor)
}

export function listManageableClubsForUser(user: AccountUser | null) {
  const clubs = readClubs().sort((a, b) => b.updatedAt - a.updatedAt)
  const actor = getLatestActor(user)

  if (!actor) {
    return []
  }

  if (isAdmin(actor)) {
    return clubs
  }

  if (isTeacher(actor)) {
    return clubs.filter((club) => actor.managedClubIds.includes(club.id))
  }

  return []
}

export function listClubsForUser(_user: AccountUser | null) {
  return readClubs().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listCoursesForUser(_user: AccountUser | null) {
  return readCourses().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listEnrolledCourseIdsForStudent(studentId: string) {
  const enrollments = readEnrollments()
  return Array.from(
    new Set(
      enrollments
        .filter((item) => item.studentId === studentId)
        .map((item) => item.courseId)
    )
  )
}

export function ensureCampusDataInitialized() {
  const existingClubs = readClubs()

  if (existingClubs.length === 0) {
    const now = Date.now()
    const clubs: Club[] = [
      {
        id: createAccountId(),
        name: '编程社',
        description: '聚焦前端、后端、算法与工程实践。',
        createdAt: now,
        updatedAt: now
      },
      {
        id: createAccountId(),
        name: '摄影社',
        description: '学习构图、后期与活动纪实拍摄。',
        createdAt: now,
        updatedAt: now
      }
    ]

    writeClubs(clubs)
  }

  const clubs = readClubs()
  const existingCourses = readCourses()

  if (existingCourses.length === 0 && clubs.length > 0) {
    const codingClub = clubs.find((item) => item.name === '编程社') || clubs[0]
    const photoClub =
      clubs.find((item) => item.name === '摄影社') || clubs[clubs.length - 1]

    const now = Date.now()

    const courses: Course[] = [
      {
        id: createAccountId(),
        clubId: codingClub.id,
        name: 'Vue 实战入门',
        teacherName: '系统示例教师',
        description: '从组件、路由到状态管理的完整入门课程。',
        createdAt: now,
        updatedAt: now
      },
      {
        id: createAccountId(),
        clubId: photoClub.id,
        name: '校园摄影基础',
        teacherName: '系统示例教师',
        description: '掌握构图、光线与活动记录拍摄技巧。',
        createdAt: now,
        updatedAt: now
      }
    ]

    writeCourses(courses)
  }

  if (readEnrollments().length === 0) {
    writeEnrollments([])
  }
}

export function createClub(
  user: AccountUser | null,
  payload: Pick<Club, 'name' | 'description'>
) {
  const actor = getLatestActor(user)

  if (!isAdmin(actor)) {
    throw new Error('仅管理员可创建社团')
  }

  const name = sanitizeRequiredText(payload.name, '社团名称', 40)
  const description = sanitizeOptionalText(payload.description, 200)
  const clubs = readClubs()

  const duplicated = clubs.some(
    (item) => item.name.trim().toLowerCase() === name.toLowerCase()
  )
  if (duplicated) {
    throw new Error('社团名称已存在')
  }

  const now = Date.now()
  const nextClub: Club = {
    id: createAccountId(),
    name,
    description,
    createdAt: now,
    updatedAt: now
  }

  writeClubs([nextClub, ...clubs])
  return nextClub
}

export function updateClub(
  user: AccountUser | null,
  clubId: string,
  payload: Pick<Club, 'name' | 'description'>
) {
  if (!canManageClub(user, clubId)) {
    throw new Error('你没有权限编辑该社团')
  }

  const clubs = readClubs()
  const target = clubs.find((item) => item.id === clubId)

  if (!target) {
    throw new Error('社团不存在')
  }

  const name = sanitizeRequiredText(payload.name, '社团名称', 40)
  const description = sanitizeOptionalText(payload.description, 200)

  const duplicated = clubs.some(
    (item) =>
      item.id !== clubId && item.name.trim().toLowerCase() === name.toLowerCase()
  )
  if (duplicated) {
    throw new Error('社团名称已存在')
  }

  const nextClub: Club = {
    ...target,
    name,
    description,
    updatedAt: Date.now()
  }

  writeClubs(clubs.map((item) => (item.id === clubId ? nextClub : item)))
  return nextClub
}

export function deleteClub(user: AccountUser | null, clubId: string) {
  const actor = getLatestActor(user)

  if (!isAdmin(actor)) {
    throw new Error('仅管理员可删除社团')
  }

  const clubs = readClubs()
  const courses = readCourses()
  const enrollments = readEnrollments()

  const target = clubs.find((item) => item.id === clubId)
  if (!target) {
    throw new Error('社团不存在')
  }

  const removedCourseIds = new Set(
    courses.filter((item) => item.clubId === clubId).map((item) => item.id)
  )

  writeClubs(clubs.filter((item) => item.id !== clubId))
  writeCourses(courses.filter((item) => item.clubId !== clubId))
  writeEnrollments(
    enrollments.filter((item) => !removedCourseIds.has(item.courseId))
  )
}

export function createCourse(
  user: AccountUser | null,
  payload: Pick<Course, 'clubId' | 'name' | 'teacherName' | 'description'>
) {
  if (!canManageClub(user, payload.clubId)) {
    throw new Error('你没有权限在该社团下创建课程')
  }

  const clubs = readClubs()
  const targetClub = clubs.find((item) => item.id === payload.clubId)

  if (!targetClub) {
    throw new Error('所属社团不存在')
  }

  const name = sanitizeRequiredText(payload.name, '课程名称', 40)
  const teacherName = sanitizeRequiredText(payload.teacherName, '授课教师', 30)
  const description = sanitizeOptionalText(payload.description, 240)
  const courses = readCourses()

  const duplicated = courses.some(
    (item) =>
      item.clubId === payload.clubId &&
      item.name.trim().toLowerCase() === name.toLowerCase()
  )
  if (duplicated) {
    throw new Error('该社团下已存在同名课程')
  }

  const now = Date.now()
  const nextCourse: Course = {
    id: createAccountId(),
    clubId: payload.clubId,
    name,
    teacherName,
    description,
    createdAt: now,
    updatedAt: now
  }

  writeCourses([nextCourse, ...courses])
  return nextCourse
}

export function updateCourse(
  user: AccountUser | null,
  courseId: string,
  payload: Pick<Course, 'clubId' | 'name' | 'teacherName' | 'description'>
) {
  const courses = readCourses()
  const target = courses.find((item) => item.id === courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  if (!canManageCourse(user, target)) {
    throw new Error('你没有权限编辑该课程')
  }

  if (!canManageClub(user, payload.clubId)) {
    throw new Error('你没有权限移动课程到该社团')
  }

  const clubs = readClubs()
  const targetClub = clubs.find((item) => item.id === payload.clubId)
  if (!targetClub) {
    throw new Error('所属社团不存在')
  }

  const name = sanitizeRequiredText(payload.name, '课程名称', 40)
  const teacherName = sanitizeRequiredText(payload.teacherName, '授课教师', 30)
  const description = sanitizeOptionalText(payload.description, 240)

  const duplicated = courses.some(
    (item) =>
      item.id !== courseId &&
      item.clubId === payload.clubId &&
      item.name.trim().toLowerCase() === name.toLowerCase()
  )
  if (duplicated) {
    throw new Error('该社团下已存在同名课程')
  }

  const nextCourse: Course = {
    ...target,
    clubId: payload.clubId,
    name,
    teacherName,
    description,
    updatedAt: Date.now()
  }

  writeCourses(courses.map((item) => (item.id === courseId ? nextCourse : item)))
  return nextCourse
}

export function deleteCourse(user: AccountUser | null, courseId: string) {
  const courses = readCourses()
  const target = courses.find((item) => item.id === courseId)

  if (!target) {
    throw new Error('课程不存在')
  }

  if (!canManageCourse(user, target)) {
    throw new Error('你没有权限删除该课程')
  }

  writeCourses(courses.filter((item) => item.id !== courseId))
  writeEnrollments(readEnrollments().filter((item) => item.courseId !== courseId))
}

export function enrollInCourse(
  user: AccountUser | null,
  courseId: string,
  targetStudentId?: string
) {
  const actor = getLatestActor(user)

  if (!actor) {
    throw new Error('请先登录')
  }

  const studentId = targetStudentId || actor.id

  if (actor.role === 'student' && studentId !== actor.id) {
    throw new Error('学生仅可为自己选课')
  }

  if (actor.role !== 'student' && actor.role !== 'admin') {
    throw new Error('当前账户没有选课权限')
  }

  const targetStudent = readAccounts().find((item) => item.id === studentId)
  if (!targetStudent) {
    throw new Error('目标学生不存在')
  }

  if (targetStudent.role !== 'student') {
    throw new Error('仅学生账户可以产生选课记录')
  }

  const course = readCourses().find((item) => item.id === courseId)
  if (!course) {
    throw new Error('课程不存在')
  }

  const enrollments = readEnrollments()
  const existed = enrollments.some(
    (item) => item.courseId === courseId && item.studentId === studentId
  )

  if (existed) {
    throw new Error('已选过该课程')
  }

  const nextEnrollment: EnrollmentRecord = {
    id: createAccountId(),
    courseId,
    studentId,
    createdAt: Date.now()
  }

  writeEnrollments([nextEnrollment, ...enrollments])
  return nextEnrollment
}

export function getEnrollmentViewsForUser(user: AccountUser | null) {
  const actor = getLatestActor(user)
  if (!actor) {
    return [] satisfies EnrollmentView[]
  }

  const courses = readCourses()
  const clubs = readClubs()
  const accounts = readAccounts()
  const enrollments = readEnrollments()

  const manageableClubIdSet = new Set(actor.managedClubIds || [])

  return enrollments
    .filter((item) => {
      if (actor.role === 'admin') {
        return true
      }

      if (actor.role === 'teacher') {
        const course = courses.find((courseItem) => courseItem.id === item.courseId)
        return !!course && manageableClubIdSet.has(course.clubId)
      }

      return item.studentId === actor.id
    })
    .map((item) => {
      const course = courses.find((courseItem) => courseItem.id === item.courseId)
      const club = clubs.find((clubItem) => clubItem.id === course?.clubId)
      const student = accounts.find((account) => account.id === item.studentId)

      return {
        id: item.id,
        courseId: item.courseId,
        courseName: course?.name || '未知课程',
        clubId: club?.id || '',
        clubName: club?.name || '未知社团',
        studentId: item.studentId,
        studentUsername: student?.username || '未知用户',
        studentDisplayName:
          student?.displayName || student?.username || '未知用户',
        createdAt: item.createdAt
      } satisfies EnrollmentView
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getLeaderboardForUser(user: AccountUser | null) {
  const views = getEnrollmentViewsForUser(user)
  const scoreMap = new Map<string, LeaderboardEntry>()

  for (const item of views) {
    const existed = scoreMap.get(item.studentId)

    if (existed) {
      existed.enrollmentCount += 1
      continue
    }

    scoreMap.set(item.studentId, {
      studentId: item.studentId,
      username: item.studentUsername,
      displayName: item.studentDisplayName,
      enrollmentCount: 1
    })
  }

  return Array.from(scoreMap.values()).sort((a, b) => {
    if (b.enrollmentCount !== a.enrollmentCount) {
      return b.enrollmentCount - a.enrollmentCount
    }

    return a.username.localeCompare(b.username, 'zh-CN')
  })
}