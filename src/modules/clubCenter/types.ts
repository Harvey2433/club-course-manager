export interface Club {
  id: string
  name: string
  description: string
  managerUserIds: string[]
  createdAt: number
  updatedAt: number
}

export interface Course {
  id: string
  name: string
  description: string
  clubId: string
  clubName: string
  teacherId: string
  teacherName: string
  createdAt: number
  updatedAt: number
}

export interface EnrollmentRecord {
  id: string
  studentId: string
  studentName: string
  courseId: string
  courseName: string
  clubId: string
  clubName: string
  createdAt: number
}

export interface LeaderboardItem {
  studentId: string
  studentName: string
  enrollmentCount: number
}

export interface CreateClubPayload {
  name: string
  description: string
}

export interface UpdateClubPayload extends CreateClubPayload {
  clubId: string
}

export interface CreateCoursePayload {
  name: string
  description: string
  clubId: string
  teacherId?: string
}

export interface UpdateCoursePayload extends CreateCoursePayload {
  courseId: string
}