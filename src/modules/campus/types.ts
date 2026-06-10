export interface Club {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface Course {
  id: string
  clubId: string
  name: string
  teacherName: string
  description: string
  createdAt: number
  updatedAt: number
}

export interface EnrollmentRecord {
  id: string
  courseId: string
  studentId: string
  createdAt: number
}

export interface EnrollmentView {
  id: string
  courseId: string
  courseName: string
  clubId: string
  clubName: string
  studentId: string
  studentUsername: string
  studentDisplayName: string
  createdAt: number
}

export interface LeaderboardEntry {
  studentId: string
  username: string
  displayName: string
  enrollmentCount: number
}