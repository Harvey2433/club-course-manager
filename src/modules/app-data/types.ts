export type {
  Club,
  Course,
  CourseResultAttachment,
  Enrollment,
  EnrollmentView,
  RankingEntry
} from '../../api/backend'

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