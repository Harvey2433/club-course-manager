import { invoke } from '@tauri-apps/api/core'

export type AccountRole = 'admin' | 'student' | 'teacher'

export interface AccountUser {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string | null
  role: AccountRole
  enterpriseEmail: string
  createdAt: number
  updatedAt: number
  managedClubIds: string[]
}

export interface AuthResult {
  token: string
  user: AccountUser
}

export interface Club {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface CourseResultAttachment {
  fileName: string
  mimeType: string
  dataUrl: string
  uploadedAt: number
}

export interface Course {
  id: string
  clubId: string
  name: string
  teacherName: string
  description: string
  resultAttachment: CourseResultAttachment | null
  createdAt: number
  updatedAt: number
}

export interface Enrollment {
  id: string
  courseId: string
  studentUserId: string
  createdAt: number
}

export interface EnrollmentView {
  id: string
  studentUserId: string
  studentDisplayName: string
  studentUsername: string
  studentRole: AccountRole
  courseId: string
  courseName: string
  clubName: string
  teacherName: string
  createdAt: number
}

export interface RankingEntry {
  userId: string
  username: string
  displayName: string
  role: AccountRole
  enrolledCount: number
}

// ---------- 认证 ----------

export function apiRegister(username: string, displayName: string, password: string) {
  return invoke<AuthResult>('register', { username, displayName, password })
}

export function apiLogin(username: string, password: string) {
  return invoke<AuthResult>('login', { username, password })
}

export function apiLogout(token: string) {
  return invoke<void>('logout', { token })
}

export function apiCurrentUser(token: string) {
  return invoke<AccountUser | null>('current_user', { token })
}

export function apiChangePassword(token: string, currentPassword: string, nextPassword: string) {
  return invoke<AccountUser>('change_password', { token, currentPassword, nextPassword })
}

export function apiUpdateProfile(
  token: string,
  payload: { displayName: string; bio: string; enterpriseEmail: string; avatar?: string | null }
) {
  return invoke<AccountUser>('update_profile', {
    token,
    displayName: payload.displayName,
    bio: payload.bio,
    enterpriseEmail: payload.enterpriseEmail,
    avatar: payload.avatar ?? null
  })
}

// ---------- 管理员 ----------

export function apiListAccounts(token: string) {
  return invoke<AccountUser[]>('list_accounts', { token })
}

export function apiAdminUpdateAccount(
  token: string,
  payload: {
    userId: string
    displayName: string
    bio: string
    role: AccountRole
    enterpriseEmail: string
    managedClubIds: string[]
    avatar?: string | null
  }
) {
  return invoke<AccountUser>('admin_update_account', {
    token,
    userId: payload.userId,
    displayName: payload.displayName,
    bio: payload.bio,
    role: payload.role,
    enterpriseEmail: payload.enterpriseEmail,
    managedClubIds: payload.managedClubIds,
    avatar: payload.avatar ?? null
  })
}

// ---------- 社团 ----------

export function apiListClubs(token: string) {
  return invoke<Club[]>('list_clubs', { token })
}

export function apiCreateClub(token: string, payload: { name: string; description: string }) {
  return invoke<Club>('create_club', { token, name: payload.name, description: payload.description })
}

export function apiUpdateClub(token: string, payload: { id: string; name: string; description: string }) {
  return invoke<Club>('update_club', { token, id: payload.id, name: payload.name, description: payload.description })
}

export function apiDeleteClub(token: string, id: string) {
  return invoke<void>('delete_club', { token, id })
}

// ---------- 课程 ----------

export function apiListCourses(token: string) {
  return invoke<Course[]>('list_courses', { token })
}

export function apiCreateCourse(
  token: string,
  payload: { clubId: string; name: string; teacherName: string; description: string }
) {
  return invoke<Course>('create_course', {
    token,
    clubId: payload.clubId,
    name: payload.name,
    teacherName: payload.teacherName,
    description: payload.description
  })
}

export function apiUpdateCourse(
  token: string,
  payload: { id: string; clubId: string; name: string; teacherName: string; description: string }
) {
  return invoke<Course>('update_course', {
    token,
    id: payload.id,
    clubId: payload.clubId,
    name: payload.name,
    teacherName: payload.teacherName,
    description: payload.description
  })
}

export function apiDeleteCourse(token: string, id: string) {
  return invoke<void>('delete_course', { token, id })
}

export function apiUploadCourseResult(
  token: string,
  payload: { courseId: string; fileName: string; mimeType: string; dataUrl: string }
) {
  return invoke<Course>('upload_course_result', {
    token,
    courseId: payload.courseId,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    dataUrl: payload.dataUrl
  })
}

export function apiRemoveCourseResult(token: string, courseId: string) {
  return invoke<Course>('remove_course_result', { token, courseId })
}

// ---------- 选课 ----------

export function apiEnrollCourse(token: string, courseId: string, studentId?: string) {
  return invoke<Enrollment>('enroll_course', { token, courseId, studentId: studentId ?? null })
}

export function apiListEnrollmentViews(token: string) {
  return invoke<EnrollmentView[]>('list_enrollment_views', { token })
}

export function apiListRanking(token: string) {
  return invoke<RankingEntry[]>('list_ranking', { token })
}