// src/modules/app-data/types.ts
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

export interface EnrollmentRecord {
  id: string
  courseId: string
  studentUserId: string
  createdAt: number
}

export interface AppDataSnapshot {
  clubs: Club[]
  courses: Course[]
  enrollments: EnrollmentRecord[]
}

export interface CreateClubPayload {
  name: string
  description: string
}

export interface UpdateClubPayload {
  id: string
  name: string
  description: string
}

export interface CreateCoursePayload {
  clubId: string
  name: string
  teacherName: string
  description: string
}

export interface UpdateCoursePayload {
  id: string
  clubId: string
  name: string
  teacherName: string
  description: string
}

export interface UploadCourseResultPayload {
  courseId: string
  fileName: string
  mimeType: string
  dataUrl: string
}

export interface RemoveCourseResultPayload {
  courseId: string
}