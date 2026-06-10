import { invoke } from '@tauri-apps/api/core'

export interface Course {
  id: number
  name: string
  teacher_name: string
  description: string
}

export async function fetchCourses(): Promise<Course[]> {
  return await invoke<Course[]>('get_courses')
}