import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Radio, Send, Smartphone, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { api, getNickname, getParticipantId, type ActiveDTO } from '@/lib/api'

/** 与后端保持一致的关键词切分规则 */
function splitKeywords(raw: string): string[] {
  const parts = raw
    .split(/[,，、;；\s\n\r\t]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 30)
  return Array.from(new Set(parts)).slice(0, 20)
}

export default function StudentRoom() {
  const { classroomId = '' } = useParams()
  const [active, setActive] = useState<ActiveDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const currentQuestionId = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getActive(classroomId, getParticipantId())
      setActive(data)
      setError('')

      const qid = data.question?.id ?? null
      // 仅在题目切换时重置本地作答，避免覆盖学员正在输入的内容
      if (qid !== currentQuestionId.current) {
        currentQuestionId.current = qid
        if (data.myAnswer) {
          setSelectedIds(data.myAnswer.optionIds)
          setText(data.myAnswer.textContent || data.myAnswer.keywords.join(' '))
          setDone(data.answered)
        } else {
          setSelectedIds([])
          setText('')
          setDone(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法连接课堂')
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 2000)
    return () => clearInterval(timer)
  }, [load])

  const question = active?.question ?? null

  const toggleOption = (id: string) => {
    if (question?.type === 'SINGLE') {
      setSelectedIds([id])
      return
    }
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const handleSubmit = async () => {
    if (!question) return

    const payload: {
      participantId: string
      nickname: string
      optionIds?: string[]
      textContent?: string
      keywords?: string[]
    } = {
      participantId: getParticipantId(),
      nickname: getNickname(),
    }

    if (question.type === 'SINGLE' || question.type === 'MULTI') {
      if (selectedIds.length === 0) {
        toast.error('请先选择一个选项')
        return
      }
      payload.optionIds = selectedIds
    } else if (question.type === 'TEXT') {
      if (!text.trim()) {
        toast.error('请先填写您的回答')
        return
      }
      payload.textContent = text.trim()
    } else {
      const words = splitKeywords(text)
      if (words.length === 0) {
        toast.error('请至少填写一个关键词')
        return
      }
      payload.keywords = words
    }

    setSubmitting(true)
    try {
      await api.submitAnswer(question.id, payload)
      setDone(true)
      toast.success('提交成功')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在进入课堂…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-base font-semibold text-foreground">无法进入课堂</p>
      <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
      <Link to="/student">
        <Button>重新输入课堂码</Button>
      </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen medical-grid-bg pb-10">
      {/* 顶部 */}
      <div className="medical-gradient text-white">
        <div className="mx-auto max-w-xl px-5 py-5">
          <div className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4" />
            <span className="truncate">{active?.classroom.title ?? '课堂'}</span>
            <Badge variant="accent" className="ml-auto shrink-0">
              课堂码 {active?.classroom.code}
            </Badge>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 py-6">
        {/* 等待教师发布题目 */}
        {!question && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="relative">
                <Smartphone className="h-10 w-10 text-accent" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">已进入课堂</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  请等待教师发布题目，题目出现后本页会自动刷新
                </p>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wifi className="h-3.5 w-3.5" />
                保持页面打开即可
              </div>
            </CardContent>
          </Card>
        )}

        {/* 答题区 */}
        {question && (
          <div className="animate-fade-in-up space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="default">
                    {question.type === 'SINGLE'
                      ? '单选题'
                      : question.type === 'MULTI'
                        ? '多选题'
                        : question.type === 'TEXT'
                          ? '简答题'
                          : '关键词题'}
                  </Badge>
                  {!done && <span className="text-xs text-muted-foreground">请选择或填写后提交</span>}
                </div>
                <h2 className="text-lg font-semibold leading-relaxed text-foreground">
                  {question.title}
                </h2>
              </CardContent>
            </Card>

            {/* 选择题 */}
            {(question.type === 'SINGLE' || question.type === 'MULTI') && (
              <div className="space-y-2.5">
                {question.options.map(opt => {
                  const active = selectedIds.includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all active:scale-[0.99]',
                        active
                          ? 'border-accent bg-secondary ring-1 ring-accent'
                          : 'border-border bg-card hover:bg-secondary/40',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors',
                          question.type === 'MULTI' ? 'rounded-md' : 'rounded-full',
                          active ? 'bg-accent text-white' : 'bg-muted text-muted-foreground',
                        ].join(' ')}
                      >
                        {opt.label}
                      </span>
                      <span className="flex-1 text-sm leading-relaxed text-foreground">
                        {opt.content}
                      </span>
                      {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 简答题 */}
            {question.type === 'TEXT' && (
              <Card>
                <CardContent className="space-y-2 p-5">
                  <Label htmlFor="answer-text">您的回答</Label>
                  <Textarea
                    id="answer-text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="请写下您的想法…"
                    className="min-h-[160px]"
                    maxLength={2000}
                  />
                  <p className="text-right text-xs text-muted-foreground">{text.length} / 2000</p>
                </CardContent>
              </Card>
            )}

            {/* 关键词题 */}
            {question.type === 'KEYWORD' && (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <Label htmlFor="answer-keyword">关键词</Label>
                  <Input
                    id="answer-keyword"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="例如：共情, 知情同意, 隐私"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    多个关键词请用逗号、顿号或空格隔开，系统会自动生成课堂词云。
                  </p>
                  {splitKeywords(text).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {splitKeywords(text).map(w => (
                        <span
                          key={w}
                          className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 提交按钮 / 已提交提示 */}
            {done ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-base font-semibold text-emerald-800">已提交</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    您可以在教师结束答题前修改答案，重新提交即可覆盖
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDone(false)}>
                  修改我的答案
                </Button>
              </div>
            ) : (
              <Button size="xl" className="w-full" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                提交答案
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
