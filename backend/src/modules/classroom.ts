import { Router, Request } from 'express'
import { z } from 'zod'
import { prisma } from '../db'
import { generateClassCode, generateTeacherToken } from '../utils/codes'
import { AppError } from '../middleware/errorHandler'
import { validate } from '../middleware/validation'

export const classroomRouter: Router = Router()
export const questionRouter: Router = Router()

const QUESTION_TYPES = ['SINGLE', 'MULTI', 'TEXT', 'KEYWORD'] as const

// ---------------- 工具函数 ----------------

/** 校验教师身份：请求头必须携带正确的教师管理令牌 */
async function requireTeacher(req: Request) {
  const token = req.header('x-teacher-token')
  if (!token) throw new AppError(401, '缺少教师管理令牌，请重新进入教师端')
  const classroom = await prisma.classroom.findUnique({ where: { id: String(req.params.id) } })
  if (!classroom) throw new AppError(404, '课堂不存在或已删除')
  if (classroom.teacherToken !== token) throw new AppError(403, '教师管理令牌无效')
  return classroom
}

async function requireQuestionTeacher(req: Request) {
  const token = req.header('x-teacher-token')
  if (!token) throw new AppError(401, '缺少教师管理令牌，请重新进入教师端')
  const question = await prisma.question.findUnique({
    where: { id: String(req.params.id) },
    include: { classroom: true },
  })
  if (!question) throw new AppError(404, '题目不存在')
  if (question.classroom.teacherToken !== token) throw new AppError(403, '教师管理令牌无效')
  return question
}

const safeJson = <T,>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 把学员输入的一串关键词切成数组（支持中英文逗号、顿号、分号、空格、换行） */
function splitKeywords(raw: string): string[] {
  const parts = raw
    .split(/[,，、;；\s\n\r\t]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 30)
  return Array.from(new Set(parts)).slice(0, 20)
}

/** 计算某道题的实时统计结果 */
async function buildStats(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { order: 'asc' } } },
  })
  if (!question) throw new AppError(404, '题目不存在')

  const answers = await prisma.answer.findMany({
    where: { questionId },
    orderBy: { createdAt: 'asc' },
  })

  const total = answers.length

  // 选择题：统计每个选项的人数和百分比
  if (question.type === 'SINGLE' || question.type === 'MULTI') {
    const counter = new Map<string, number>()
    for (const answer of answers) {
      const ids = safeJson<string[]>(answer.optionIds, [])
      for (const id of ids) counter.set(id, (counter.get(id) ?? 0) + 1)
    }
    const options = question.options.map(o => {
      const count = counter.get(o.id) ?? 0
      return {
        id: o.id,
        label: o.label,
        content: o.content,
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
      }
    })
    return {
      questionId,
      type: question.type,
      status: question.status,
      total,
      options,
      texts: [],
      words: [],
    }
  }

  // 简答题：返回学员提交的原始文字
  if (question.type === 'TEXT') {
    const texts = answers
      .filter(a => a.textContent.trim().length > 0)
      .map(a => ({
        id: a.id,
        nickname: a.nickname,
        content: a.textContent,
        createdAt: a.createdAt.toISOString(),
      }))
    return {
      questionId,
      type: question.type,
      status: question.status,
      total: texts.length,
      options: [],
      texts,
      words: [],
    }
  }

  // 关键词题：汇总词频，用于生成中文词云
  const counter = new Map<string, number>()
  for (const answer of answers) {
    const words = safeJson<string[]>(answer.keywords, [])
    for (const w of words) {
      const key = w.trim()
      if (!key) continue
      counter.set(key, (counter.get(key) ?? 0) + 1)
    }
  }
  const words = Array.from(counter.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'zh'))
    .slice(0, 60)

  return {
    questionId,
    type: question.type,
    status: question.status,
    total,
    options: [],
    texts: [],
    words,
  }
}

// ---------------- 课堂相关接口 ----------------

/** 创建课堂（教师端） */
classroomRouter.post(
  '/',
  validate(z.object({ title: z.string().trim().min(1, '请填写课堂名称').max(60, '名称过长') })),
  async (req, res) => {
    const title = String(req.body.title).trim()

    // 生成不重复的 6 位课堂码
    let code = generateClassCode(6)
    for (let i = 0; i < 12; i++) {
      const exists = await prisma.classroom.findUnique({ where: { code } })
      if (!exists) break
      code = generateClassCode(6)
    }

    const classroom = await prisma.classroom.create({
      data: { title, code, teacherToken: generateTeacherToken() },
    })

    res.status(201).json({
      status: 'success',
      data: {
        id: classroom.id,
        code: classroom.code,
        title: classroom.title,
        teacherToken: classroom.teacherToken,
        createdAt: classroom.createdAt.toISOString(),
      },
    })
  }
)

/** 学员凭课堂码加入课堂（免注册） */
classroomRouter.post(
  '/join',
  validate(z.object({ code: z.string().trim().min(4, '请输入课堂码').max(12) })),
  async (req, res) => {
    const code = String(req.body.code).trim().toUpperCase()
    const classroom = await prisma.classroom.findUnique({ where: { code } })
    if (!classroom) throw new AppError(404, '课堂码不存在，请向教师确认')

    res.json({
      status: 'success',
      data: {
        id: classroom.id,
        code: classroom.code,
        title: classroom.title,
      },
    })
  }
)

/** 课堂详情（教师端，含全部题目与提交人数） */
classroomRouter.get('/:id', async (req, res) => {
  const classroom = await requireTeacher(req)
  const questions = await prisma.question.findMany({
    where: { classroomId: classroom.id },
    orderBy: { order: 'asc' },
    include: {
      options: { orderBy: { order: 'asc' } },
      _count: { select: { answers: true } },
    },
  })

  res.json({
    status: 'success',
    data: {
      id: classroom.id,
      code: classroom.code,
      title: classroom.title,
      teacherToken: classroom.teacherToken,
      createdAt: classroom.createdAt.toISOString(),
      questions: questions.map(q => ({
        id: q.id,
        type: q.type,
        title: q.title,
        status: q.status,
        order: q.order,
        createdAt: q.createdAt.toISOString(),
        submitted: q._count.answers,
        options: q.options.map(o => ({ id: o.id, label: o.label, content: o.content })),
      })),
    },
  })
})

/** 学员端：查询当前正在作答的题目 + 本人是否已提交 */
classroomRouter.get('/:id/active', async (req, res) => {
  const participantId = String(req.query.participantId ?? '').trim()
  const classroom = await prisma.classroom.findUnique({ where: { id: String(req.params.id) } })
  if (!classroom) throw new AppError(404, '课堂不存在或已结束')

  const question = await prisma.question.findFirst({
    where: { classroomId: classroom.id, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  let answered = false
  let myAnswer: { optionIds: string[]; textContent: string; keywords: string[] } | null = null

  if (question && participantId) {
    const mine = await prisma.answer.findUnique({
      where: { questionId_participantId: { questionId: question.id, participantId } },
    })
    if (mine) {
      answered = true
      myAnswer = {
        optionIds: safeJson<string[]>(mine.optionIds, []),
        textContent: mine.textContent,
        keywords: safeJson<string[]>(mine.keywords, []),
      }
    }
  }

  res.json({
    status: 'success',
    data: {
      classroom: { id: classroom.id, code: classroom.code, title: classroom.title },
      question: question
        ? {
            id: question.id,
            type: question.type,
            title: question.title,
            status: question.status,
            options: question.options.map(o => ({ id: o.id, label: o.label, content: o.content })),
          }
        : null,
      answered,
      myAnswer,
    },
  })
})

// ---------------- 题目相关接口 ----------------

/** 发布新题目（教师端） */
classroomRouter.post('/:id/questions', async (req, res) => {
  const classroom = await requireTeacher(req)

  const schema = z.object({
    type: z.enum(QUESTION_TYPES),
    title: z.string().trim().min(1, '请填写题干').max(500, '题干过长'),
    options: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(4),
          content: z.string().trim().min(1, '选项内容不能为空').max(200),
        })
      )
      .optional()
      .default([]),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? '题目格式有误')
  const { type, title, options } = parsed.data

  const needsOptions = type === 'SINGLE' || type === 'MULTI'
  if (needsOptions && options.length < 2) throw new AppError(400, '选择题至少需要 2 个选项')

  const last = await prisma.question.findFirst({
    where: { classroomId: classroom.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const question = await prisma.question.create({
    data: {
      classroomId: classroom.id,
      type,
      title,
      order: (last?.order ?? 0) + 1,
      options: needsOptions
        ? { create: options.map((o, i) => ({ label: o.label, content: o.content, order: i })) }
        : undefined,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  res.status(201).json({
    status: 'success',
    data: {
      id: question.id,
      type: question.type,
      title: question.title,
      status: question.status,
      order: question.order,
      submitted: 0,
      options: question.options.map(o => ({ id: o.id, label: o.label, content: o.content })),
    },
  })
})

/** 开始答题（教师端）— 同一课堂同时只开放一道题 */
questionRouter.post('/:id/open', async (req, res) => {
  const question = await requireQuestionTeacher(req)

  await prisma.$transaction([
    prisma.question.updateMany({
      where: { classroomId: question.classroomId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() },
    }),
    prisma.question.update({
      where: { id: question.id },
      data: { status: 'OPEN', openedAt: new Date(), closedAt: null },
    }),
  ])

  res.json({ status: 'success', data: { id: question.id, status: 'OPEN' } })
})

/** 结束答题（教师端） */
questionRouter.post('/:id/close', async (req, res) => {
  const question = await requireQuestionTeacher(req)
  await prisma.question.update({
    where: { id: question.id },
    data: { status: 'CLOSED', closedAt: new Date() },
  })
  res.json({ status: 'success', data: { id: question.id, status: 'CLOSED' } })
})

/** 删除题目（教师端） */
questionRouter.delete('/:id', async (req, res) => {
  const question = await requireQuestionTeacher(req)
  await prisma.question.delete({ where: { id: question.id } })
  res.json({ status: 'success', data: { id: question.id } })
})

/** 实时统计（教师端轮询此接口） */
questionRouter.get('/:id/stats', async (req, res) => {
  await requireQuestionTeacher(req)
  const stats = await buildStats(String(req.params.id))
  res.json({ status: 'success', data: stats })
})

/** 学员提交答案（免注册） */
questionRouter.post('/:id/answers', async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { id: String(req.params.id) },
    include: { classroom: true },
  })
  if (!question) throw new AppError(404, '题目不存在')
  if (question.status !== 'OPEN') {
    throw new AppError(409, question.status === 'CLOSED' ? '本题已结束答题' : '本题尚未开始答题')
  }

  const schema = z.object({
    participantId: z.string().trim().min(3).max(64),
    nickname: z.string().trim().max(20).optional().default(''),
    optionIds: z.array(z.string()).max(20).optional().default([]),
    textContent: z.string().max(2000).optional().default(''),
    keywords: z.array(z.string()).max(20).optional().default([]),
  })

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) throw new AppError(400, '提交内容格式有误')
  const { participantId, nickname, optionIds, textContent, keywords } = parsed.data

  // 校验选项确实属于本题
  let validOptionIds: string[] = []
  if (question.type === 'SINGLE' || question.type === 'MULTI') {
    const all = await prisma.questionOption.findMany({
      where: { questionId: question.id },
      select: { id: true },
    })
    const valid = new Set(all.map(o => o.id))
    validOptionIds = optionIds.filter(id => valid.has(id))
    if (question.type === 'SINGLE') validOptionIds = validOptionIds.slice(0, 1)
    if (validOptionIds.length === 0) throw new AppError(400, '请选择一个选项')
  }

  const data = {
    optionIds: JSON.stringify(validOptionIds),
    textContent: question.type === 'TEXT' ? textContent.trim() : '',
    keywords: JSON.stringify(
      question.type === 'KEYWORD' && keywords.length === 0
        ? splitKeywords(textContent)
        : keywords.map(k => String(k).trim()).filter(Boolean).slice(0, 20)
    ),
    nickname: nickname.trim().slice(0, 20),
  }

  if (question.type === 'TEXT' && data.textContent.length === 0) {
    throw new AppError(400, '请先填写您的回答')
  }
  if (question.type === 'KEYWORD' && safeJson<string[]>(data.keywords, []).length === 0) {
    throw new AppError(400, '请至少填写一个关键词')
  }

  // 同一学员重复提交则更新（允许在答题期间修改）
  const answer = await prisma.answer.upsert({
    where: { questionId_participantId: { questionId: question.id, participantId } },
    create: {
      questionId: question.id,
      classroomId: question.classroomId,
      participantId,
      ...data,
    },
    update: data,
  })

  res.status(201).json({ status: 'success', data: { id: answer.id } })
})
