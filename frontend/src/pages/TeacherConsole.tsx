import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BarChart3,
  Link2,
  Loader2,
  PlayCircle,
  Square,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import QuestionComposer from '@/components/QuestionComposer'
import ResultPanel from '@/components/ResultPanel'
import QRCodePanel from '@/components/QRCodePanel'
import {
  api,
  QUESTION_TYPE_LABEL,
  STATUS_LABEL,
  type ClassroomDTO,
  type StatsDTO,
} from '@/lib/api'

export default function TeacherConsole() {
  const { classroomId = '' } = useParams()
  const [classroom, setClassroom] = useState<ClassroomDTO | null>(null)
  const [stats, setStats] = useState<StatsDTO | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [pending, setPending] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.getClassroom(classroomId)
      setClassroom(data)
      setLoadError('')
      return data
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '无法加载课堂')
      throw err
    }
  }, [classroomId])

  // 每 2 秒拉取一次课堂数据，保证提交人数、题目状态实时更新
  useEffect(() => {
    if (!classroomId) return
    let cancelled = false
    const tick = () => {
      refresh().catch(() => undefined)
    }
    tick()
    const timer = setInterval(() => {
      if (!cancelled) tick()
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [classroomId, refresh])

  // 自动跟随当前正在答题的题目
  useEffect(() => {
    if (!classroom) return
    const open = classroom.questions.find(q => q.status === 'OPEN')
    if (open && open.id !== selectedId) {
      setSelectedId(open.id)
      return
    }
    if (!selectedId && classroom.questions.length > 0) {
      setSelectedId(classroom.questions[0].id)
    }
  }, [classroom, selectedId])

  // 拉取当前选中题目的实时统计
  useEffect(() => {
    if (!classroomId || !selectedId) {
      setStats(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await api.getStats(selectedId, classroomId)
        if (!cancelled) setStats(data)
      } catch {
        /* 忽略网络抖动 */
      }
    }
    load()
    const timer = setInterval(() => {
      if (!cancelled) load()
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [classroomId, selectedId])

  const selected = useMemo(
    () => classroom?.questions.find(q => q.id === selectedId) ?? null,
    [classroom, selectedId]
  )

  const runAction = async (action: () => Promise<unknown>, id: string, successMsg: string) => {
    setPending(id)
    try {
      await action()
      await refresh()
      setStats(await api.getStats(id, classroomId))
      toast.success(successMsg)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setPending(null)
    }
  }

  const joinUrl = classroom ? `${window.location.origin}/student?code=${classroom.code}` : ''

  const copyJoinLink = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      toast.success('学员入口链接已复制')
    } catch {
      toast.error('复制失败，请手动复制下方链接')
    }
  }

  // 未携带有效教师令牌时的处理
  if (loadError && !classroom) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-base font-semibold text-foreground">无法进入教师端</p>
        <p className="max-w-md text-sm text-muted-foreground">{loadError}</p>
        <div className="flex gap-3">
          <Link to="/teacher">
            <Button>返回教师端首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen medical-grid-bg">
      {/* 顶部信息条 */}
      <div className="medical-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 py-5 md:py-7">
          <Link
            to="/teacher"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            教师端
          </Link>

          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
                {classroom?.title ?? '加载中…'}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/70">课堂码</span>
                  <span className="rounded-lg bg-white/15 px-3 py-1 font-mono text-xl font-bold tracking-[0.25em] md:text-2xl">
                    {classroom?.code ?? '------'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyJoinLink()}
                    title="复制学员入口链接，可发送到微信群"
                    className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/10 px-2 py-1.5 text-xs text-white/90 backdrop-blur transition-colors hover:bg-white/20"
                  >
                    <Link2 className="h-3 w-3" />
                    复制链接
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-white/80">
                  <Users className="h-4 w-4" />
                  题目 {classroom?.questions.length ?? 0} 道
                </div>
              </div>
            </div>

            {classroom && <QRCodePanel value={joinUrl} size={112} />}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* 左栏：出题 + 题目列表 */}
          <div className="space-y-6">
            <QuestionComposer classroomId={classroomId} onCreated={q => setSelectedId(q.id)} />

            <Card>
              <CardHeader>
                <CardTitle>题目列表</CardTitle>
                <CardDescription>
                  点击题目查看结果；同一时间只有一道题处于“答题中”。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!classroom || classroom.questions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    还没有题目，请在上方发布第一道题
                  </p>
                ) : (
                  <div className="space-y-3">
                    {classroom.questions.map((q, index) => (
                      <div
                        key={q.id}
                        className={[
                          'rounded-lg border p-4 transition-all',
                          q.id === selectedId
                            ? 'border-accent bg-secondary/60 ring-1 ring-accent'
                            : 'border-border bg-card hover:bg-secondary/30',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(q.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                              {index + 1}
                            </span>
                            <Badge variant={q.status === 'OPEN' ? 'success' : 'secondary'}>
                              {QUESTION_TYPE_LABEL[q.type]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {STATUS_LABEL[q.status]}
                            </span>
                            <span className="ml-auto shrink-0 text-xs font-semibold text-accent">
                              {q.submitted} 人已答
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground">
                            {q.title}
                          </p>
                        </button>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {q.status !== 'OPEN' ? (
                            <Button
                              variant="accent"
                              size="sm"
                              disabled={pending === q.id}
                              onClick={() =>
                                runAction(
                                  () => api.openQuestion(q.id, classroomId),
                                  q.id,
                                  '已开始答题，学员现在可以提交'
                                )
                              }
                            >
                              {pending === q.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5" />
                              )}
                              开始答题
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={pending === q.id}
                              onClick={() =>
                                runAction(
                                  () => api.closeQuestion(q.id, classroomId),
                                  q.id,
                                  '已结束答题'
                                )
                              }
                            >
                              {pending === q.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Square className="h-3.5 w-3.5" />
                              )}
                              结束答题
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              runAction(
                                () => api.deleteQuestion(q.id, classroomId),
                                q.id,
                                '题目已删除'
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右栏：实时结果 */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                实时结果
              </CardTitle>
              {selected && (
                <CardDescription className="text-sm leading-relaxed text-foreground">
                  <span className="mr-2 inline-flex items-center rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {QUESTION_TYPE_LABEL[selected.type]}
                  </span>
                  {selected.title}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ResultPanel stats={stats} loading={!stats} />
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          教师端页面每 2 秒自动刷新一次提交数据，无需手动刷新。
          <br />
          请保持本页面在投影屏幕上，学员扫码后即可开始互动。
        </p>
      </main>
    </div>
  )
}
