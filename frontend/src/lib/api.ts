import { apiClient } from './api-client'

export type QuestionType = 'SINGLE' | 'MULTI' | 'TEXT' | 'KEYWORD'
export type QuestionStatus = 'DRAFT' | 'OPEN' | 'CLOSED'

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: '单选题',
  MULTI: '多选题',
  TEXT: '简答题',
  KEYWORD: '关键词题',
}

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  DRAFT: '未开始',
  OPEN: '答题中',
  CLOSED: '已结束',
}

export interface OptionDTO {
  id: string
  label: string
  content: string
}

export interface QuestionDTO {
  id: string
  type: QuestionType
  title: string
  status: QuestionStatus
  order: number
  submitted: number
  options: OptionDTO[]
}

export interface ClassroomDTO {
  id: string
  code: string
  title: string
  teacherToken?: string
  createdAt: string
  questions: QuestionDTO[]
}

export interface ChoiceStat {
  id: string
  label: string
  content: string
  count: number
  percent: number
}

export interface TextStat {
  id: string
  nickname: string
  content: string
  createdAt: string
}

export interface WordStat {
  word: string
  count: number
}

export interface StatsDTO {
  questionId: string
  type: QuestionType
  status: QuestionStatus
  total: number
  options: ChoiceStat[]
  texts: TextStat[]
  words: WordStat[]
}

export interface ActiveDTO {
  classroom: { id: string; code: string; title: string }
  question: {
    id: string
    type: QuestionType
    title: string
    status: QuestionStatus
    options: OptionDTO[]
  } | null
  answered: boolean
  myAnswer: { optionIds: string[]; textContent: string; keywords: string[] } | null
}

/** 取后端统一包裹中的 data 字段 */
function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

// ---------- 本地凭证（仅用于识别“我是谁”，业务数据全部在云端） ----------

export function getParticipantId(): string {
  let id = localStorage.getItem('mhc_participant_id')
  if (!id) {
    id = `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
    localStorage.setItem('mhc_participant_id', id)
  }
  return id
}

export function getNickname(): string {
  return localStorage.getItem('mhc_nickname') ?? ''
}

export function setNickname(name: string) {
  localStorage.setItem('mhc_nickname', name)
}

const teacherKey = (id: string) => `mhc_teacher_token_${id}`

export function getTeacherToken(id: string): string {
  return localStorage.getItem(teacherKey(id)) ?? ''
}

export function setTeacherToken(id: string, token: string) {
  localStorage.setItem(teacherKey(id), token)
}

/** 本机保存过的课堂（教师端“继续上课”用） */
export interface SavedClassroom {
  id: string
  code: string
  title: string
}

export function listSavedClassrooms(): SavedClassroom[] {
  const raw = localStorage.getItem('mhc_my_classrooms')
  if (!raw) return []
  try {
    return JSON.parse(raw) as SavedClassroom[]
  } catch {
    return []
  }
}

export function saveClassroom(item: SavedClassroom) {
  const list = listSavedClassrooms().filter(c => c.id !== item.id)
  list.unshift(item)
  localStorage.setItem('mhc_my_classrooms', JSON.stringify(list.slice(0, 20)))
}

export function removeSavedClassroom(id: string) {
  const list = listSavedClassrooms().filter(c => c.id !== id)
  localStorage.setItem('mhc_my_classrooms', JSON.stringify(list))
  localStorage.removeItem(teacherKey(id))
}

const teacherHeaders = (id: string) => ({ 'x-teacher-token': getTeacherToken(id) })

// ---------- 接口 ----------

export const api = {
  /** 创建课堂 */
  async createClassroom(title: string) {
    const res = await apiClient.post('/classrooms', { title })
    return unwrap<ClassroomDTO>(res)
  },

  /** 学员凭课堂码加入 */
  async joinClassroom(code: string) {
    const res = await apiClient.post('/classrooms/join', { code })
    return unwrap<{ id: string; code: string; title: string }>(res)
  },

  /** 课堂详情（教师端） */
  async getClassroom(id: string) {
    const res = await apiClient.get(`/classrooms/${id}`, { headers: teacherHeaders(id) })
    return unwrap<ClassroomDTO>(res)
  },

  /** 发布题目 */
  async createQuestion(
    classroomId: string,
    payload: { type: QuestionType; title: string; options?: { label: string; content: string }[] }
  ) {
    const res = await apiClient.post(`/classrooms/${classroomId}/questions`, payload, {
      headers: teacherHeaders(classroomId),
    })
    return unwrap<QuestionDTO>(res)
  },

  async openQuestion(id: string, classroomId: string) {
    await apiClient.post(`/questions/${id}/open`, undefined, {
      headers: teacherHeaders(classroomId),
    })
  },

  async closeQuestion(id: string, classroomId: string) {
    await apiClient.post(`/questions/${id}/close`, undefined, {
      headers: teacherHeaders(classroomId),
    })
  },

  async deleteQuestion(id: string, classroomId: string) {
    await apiClient.delete(`/questions/${id}`, { headers: teacherHeaders(classroomId) })
  },

  async getStats(id: string, classroomId: string) {
    const res = await apiClient.get(`/questions/${id}/stats`, {
      headers: teacherHeaders(classroomId),
    })
    return unwrap<StatsDTO>(res)
  },

  async submitAnswer(
    id: string,
    payload: {
      participantId: string
      nickname?: string
      optionIds?: string[]
      textContent?: string
      keywords?: string[]
    }
  ) {
    const res = await apiClient.post(`/questions/${id}/answers`, payload)
    return unwrap<{ id: string }>(res)
  },

  async getActive(classroomId: string, participantId: string) {
    const res = await apiClient.get(`/classrooms/${classroomId}/active`, {
      params: { participantId },
    })
    return unwrap<ActiveDTO>(res)
  },
}
