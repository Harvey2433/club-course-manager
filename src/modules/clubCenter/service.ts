import { createAccountId } from '../account/security'
import type { AccountUser } from '../account/types'
import { readAccounts } from '../account/storage'
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
  CreateClubPayload,
  CreateCoursePayload,
  EnrollmentRecord,
  LeaderboardItem,
  UpdateClubPayload,
  UpdateCoursePayload
} from './types'

function ensureUser(user: AccountUser | null | undefined): AccountUser {
  if (!user) {
    throw new Error('请先登录后再操作')
  }

  return user
}

function sanitizeText(value: string, label: string) {
  const text = String(value || '').trim()
  if (!text) {
    throw new Error(`请输入${label}`)
  }

  return text
}

function hasClubManagePermission(user: AccountUser, clubId: string) {
  if (user.role === 'admin') {
    return true
  }

  if (user.role === 'teacher') {
    return user.managedClubIds.includes(clubId)
  }

  return false
}

function findAccountName(userId: string) {
  const account = readAccounts().find((item) => item.id === userId)
  return account?.displayName || account?.username || '未命名用户'
}

export async function listVisibleClubs(user: AccountUser | null) {
  const clubs = readClubs().slice().sort((a, b) => a.createdAt - b.createdAt)

  if (!user) {
    return clubs
  }

  if (user.role === 'admin') {
    return clubs
  }

  if (user.role === 'teacher') {
    return clubs.filter(
      (item) =>
        item.managerUserIds.includes(user.id) || user.managedClubIds.includes(item.id)
    )
  }

  return clubs
}

export async function createClub(user: AccountUser | null, payload: CreateClubPayload) {
  const current = ensureUser(user)

  if (current.role !== 'admin') {
    throw new Error('仅管理员可新增社团')
  }

  const name = sanitizeText(payload.name, '社团名称')
  const description = String(payload.description || '').trim()
  const clubs = readClubs()

  if (clubs.some((item) => item.name === name)) {
    throw new Error('社团名称已存在')
  }

  const now = Date.now()
  const club: Club = {
    id: createAccountId(),
    name,
    description,
    managerUserIds: [],
    createdAt: now,
    updatedAt: now
  }

  writeClubs([...clubs, club])
  return club
}

export async function updateClub(user: AccountUser | null, payload: UpdateClubPayload) {
  const current = ensureUser(user)

  if (current.role !== 'admin') {
    throw new Error('仅管理员可编辑社团')
  }

  const clubs = readClubs()
  const club = clubs.find((item) => item.id === payload.clubId)

  if (!club) {
    throw new Error('社团不存在')
  }

  const name = sanitizeText(payload.name, '社团名称')
  const description = String(payload.description || '').trim()

  if (clubs.some((item) => item.id !== club.id && item.name === name)) {
    throw new Error('社团名称已存在')
  }

  const updated: Club = {
    ...club,
    name,
    description,
    updatedAt: Date.now()
  }

  writeClubs(clubs.map((item) => (item.id === updated.id ? updated : item)))

  const courses = readCourses()
  const nextCourses = courses.map((item) =>
    item.clubId === updated.id
      ? {
          ...item,
          clubName: updated.name,
          updatedAt: Date.now()
        }
      : item
  )
  writeCourses(nextCourses)

  const enrollments = readEnrollments()
  const nextEnrollments = enrollments.map((item) =>
    item.clubId === updated.id ? { ...item, clubName: updated.name } : item
  )
  writeEnrollments(nextEnrollments)

  return updated
}

export async function deleteClub(user: AccountUser | null, clubId: string) {
  const current = ensureUser(user)

  if (current.role !== 'admin') {
    throw new Error('仅管理员可删除社团')
  }

  const clubs = readClubs()
  const exists = clubs.some((item) => item.id === clubId)

  if (!exists) {
    throw new Error('社团不存在')
  }

  writeClubs(clubs.filter((item) => item.id !== clubId))

  const remainingCourses = readCourses().filter((item) => item.clubId !== clubId)
  const remainingCourseIds = new Set(remainingCourses.map((item) => item.id))
  writeCourses(remainingCourses)

  const remainingEnrollments = readEnrollments().filter((item) =>
    remainingCourseIds.has(item.courseId)
  )
  writeEnrollments(remainingEnrollments)
}

export async function listVisibleCourses(user: AccountUser | null) {
  const courses = readCourses().slice().sort((a, b) => a.createdAt - b.createdAt)

  if (!user) {
    return courses
  }

  if (user.role === 'admin') {
    return courses
  }

  if (user.role === 'teacher') {
    return courses.filter(
      (item) =>
        item.teacherId === user.id || user.managedClubIds.includes(item.clubId)
    )
  }

  return courses
}

export async function createCourse(
  user: AccountUser | null,
  payload: CreateCoursePayload
) {
  const current = ensureUser(user)

  if (current.role === 'student') {
    throw new Error('学生无权新增课程')
  }

  const clubs = readClubs()
  const club = clubs.find((item) => item.id === payload.clubId)
  if (!club) {
    throw new Error('请选择有效社团')
  }

  if (!hasClubManagePermission(current, club.id)) {
    throw new Error('无权在该社团下创建课程')
  }

  const name = sanitizeText(payload.name, '课程名称')
  const description = String(payload.description || '').trim()
  const courses = readCourses()

  let teacherId = current.id
  let teacherName = current.displayName || current.username

  if (current.role === 'admin' && payload.teacherId) {
    const teacher = readAccounts().find((item) => item.id === payload.teacherId)
    if (!teacher) {
      throw new Error('授课教师不存在')
    }

    teacherId = teacher.id
    teacherName = teacher.displayName || teacher.username
  }

  const now = Date.now()
  const course: Course = {
    id: createAccountId(),
    name,
    description,
    clubId: club.id,
    clubName: club.name,
    teacherId,
    teacherName,
    createdAt: now,
    updatedAt: now
  }

  writeCourses([...courses, course])
  return course
}

export async function updateCourse(
  user: AccountUser | null,
  payload: UpdateCoursePayload
) {
  const current = ensureUser(user)
  const courses = readCourses()
  const course = courses.find((item) => item.id === payload.courseId)

  if (!course) {
    throw new Error('课程不存在')
  }

  if (current.role === 'student') {
    throw new Error('学生无权编辑课程')
  }

  if (
    current.role !== 'admin' &&
    !(
      course.teacherId === current.id ||
      current.managedClubIds.includes(course.clubId)
    )
  ) {
    throw new Error('无权编辑该课程')
  }

  const clubs = readClubs()
  const club = clubs.find((item) => item.id === payload.clubId)
  if (!club) {
    throw new Error('请选择有效社团')
  }

  if (!hasClubManagePermission(current, club.id)) {
    throw new Error('无权将课程移动到该社团')
  }

  const name = sanitizeText(payload.name, '课程名称')
  const description = String(payload.description || '').trim()

  let teacherId = course.teacherId
  let teacherName = course.teacherName

  if (current.role === 'admin' && payload.teacherId) {
    const teacher = readAccounts().find((item) => item.id === payload.teacherId)
    if (!teacher) {
      throw new Error('授课教师不存在')
    }

    teacherId = teacher.id
    teacherName = teacher.displayName || teacher.username
  } else if (current.role === 'teacher') {
    teacherId = current.id
    teacherName = current.displayName || current.username
  }

  const updated: Course = {
    ...course,
    name,
    description,
    clubId: club.id,
    clubName: club.name,
    teacherId,
    teacherName,
    updatedAt: Date.now()
  }

  writeCourses(courses.map((item) => (item.id === updated.id ? updated : item)))

  const enrollments = readEnrollments()
  const nextEnrollments = enrollments.map((item) =>
    item.courseId === updated.id
      ? {
          ...item,
          courseName: updated.name,
          clubId: updated.clubId,
          clubName: updated.clubName
        }
      : item
  )
  writeEnrollments(nextEnrollments)

  return updated
}

export async function deleteCourse(user: AccountUser | null, courseId: string) {
  const current = ensureUser(user)
  const courses = readCourses()
  const course = courses.find((item) => item.id === courseId)

  if (!course) {
    throw new Error('课程不存在')
  }

  if (current.role === 'student') {
    throw new Error('学生无权删除课程')
  }

  if (
    current.role !== 'admin' &&
    !(
      course.teacherId === current.id ||
      current.managedClubIds.includes(course.clubId)
    )
  ) {
    throw new Error('无权删除该课程')
  }

  writeCourses(courses.filter((item) => item.id !== courseId))
  writeEnrollments(readEnrollments().filter((item) => item.courseId !== courseId))
}

export async function enrollCourse(user: AccountUser | null, courseId: string) {
  const current = ensureUser(user)

  if (current.role !== 'student') {
    throw new Error('仅学生可为自己选课')
  }

  const course = readCourses().find((item) => item.id === courseId)
  if (!course) {
    throw new Error('课程不存在')
  }

  const enrollments = readEnrollments()
  const existed = enrollments.some(
    (item) => item.courseId === courseId && item.studentId === current.id
  )

  if (existed) {
    throw new Error('你已选过该课程')
  }

  const record: EnrollmentRecord = {
    id: createAccountId(),
    studentId: current.id,
    studentName: current.displayName || current.username,
    courseId: course.id,
    courseName: course.name,
    clubId: course.clubId,
    clubName: course.clubName,
    createdAt: Date.now()
  }

  writeEnrollments([...enrollments, record])
  return record
}

export async function listVisibleEnrollments(user: AccountUser | null) {
  const current = ensureUser(user)
  const enrollments = readEnrollments()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)

  if (current.role === 'admin') {
    return enrollments
  }

  if (current.role === 'teacher') {
    const visibleCourseIds = new Set(
      readCourses()
        .filter(
          (item) =>
            item.teacherId === current.id ||
            current.managedClubIds.includes(item.clubId)
        )
        .map((item) => item.id)
    )

    return enrollments.filter((item) => visibleCourseIds.has(item.courseId))
  }

  return enrollments.filter((item) => item.studentId === current.id)
}

export async function getLeaderboard(user: AccountUser | null) {
  const records = await listVisibleEnrollments(user)
  const map = new Map<string, LeaderboardItem>()

  for (const item of records) {
    const current = map.get(item.studentId)
    if (current) {
      current.enrollmentCount += 1
      continue
    }

    map.set(item.studentId, {
      studentId: item.studentId,
      studentName: item.studentName || findAccountName(item.studentId),
      enrollmentCount: 1
    })
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.enrollmentCount !== a.enrollmentCount) {
      return b.enrollmentCount - a.enrollmentCount
    }

    return a.studentName.localeCompare(b.studentName, 'zh-CN')
  })
}