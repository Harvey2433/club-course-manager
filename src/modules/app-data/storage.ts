// src/modules/app-data/storage.ts
import type {
  AppDataSnapshot,
  Club,
  Course,
  EnrollmentRecord
} from './types'

const STORAGE_KEY = 'club-course-manager:app-data'

const defaultClubs = [
  {
    id: 'club-art',
    name: '美术社',
    description: '组织绘画、设计与艺术交流活动。',
    createdAt: 1710000000000,
    updatedAt: 1710000000000
  },
  {
    id: 'club-music',
    name: '音乐社',
    description: '开展声乐、器乐与舞台演出训练。',
    createdAt: 1710000001000,
    updatedAt: 1710000001000
  }
] as const satisfies readonly Club[]

const defaultCourses = [
  {
    id: 'course-sketch',
    clubId: 'club-art',
    name: '素描基础',
    teacherName: '李老师',
    description: '学习构图、线条与明暗关系。',
    resultAttachment: null,
    createdAt: 1710000002000,
    updatedAt: 1710000002000
  },
  {
    id: 'course-piano',
    clubId: 'club-music',
    name: '钢琴入门',
    teacherName: '王老师',
    description: '讲解基础乐理与弹奏技巧。',
    resultAttachment: null,
    createdAt: 1710000003000,
    updatedAt: 1710000003000
  }
] as const satisfies readonly Course[]

const defaultEnrollments = [] as const satisfies readonly EnrollmentRecord[]

function cloneClubs(source: readonly Club[]): Club[] {
  return source.map((item) => ({ ...item }))
}

function cloneCourses(source: readonly Course[]): Course[] {
  return source.map((item) => ({
    ...item,
    resultAttachment: item.resultAttachment ? { ...item.resultAttachment } : null
  }))
}

function cloneEnrollments(source: readonly EnrollmentRecord[]): EnrollmentRecord[] {
  return source.map((item) => ({ ...item }))
}

function normalizeSnapshot(input: Partial<AppDataSnapshot> | null | undefined): AppDataSnapshot {
  return {
    clubs: cloneClubs(Array.isArray(input?.clubs) ? input!.clubs : defaultClubs),
    courses: cloneCourses(Array.isArray(input?.courses) ? input!.courses : defaultCourses),
    enrollments: cloneEnrollments(
      Array.isArray(input?.enrollments) ? input!.enrollments : defaultEnrollments
    )
  }
}

export function readAppData(): AppDataSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return normalizeSnapshot(null)
    }

    const parsed = JSON.parse(raw) as Partial<AppDataSnapshot>
    return normalizeSnapshot(parsed)
  } catch {
    return normalizeSnapshot(null)
  }
}

export function writeAppData(snapshot: AppDataSnapshot) {
  const normalized = normalizeSnapshot(snapshot)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}

export function resetAppData() {
  writeAppData(normalizeSnapshot(null))
}