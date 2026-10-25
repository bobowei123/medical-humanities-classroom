import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, GraduationCap, Link2, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import {
  api,
  getTeacherToken,
  listSavedClassrooms,
  removeSavedClassroom,
  type SavedClassroom,
} from '@/lib/api'

export default function TeacherHome() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<SavedClassroom[]>(() => listSavedClassrooms())

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = title.trim()
    if (!name) {
      toast.error('请先填写课堂名称')
      return
    }
    setLoading(true)
    try {
      const classroom = await api.createClassroom(name)
      // 教师令牌保存在本机，用于后续管理该课堂
      localStorage.setItem(`mhc_teacher_token_${classroom.id}`, classroom.teacherToken ?? '')
      const item: SavedClassroom = {
        id: classroom.id,
        code: classroom.code,
        title: classroom.title,
      }
      const next = [item, ...listSavedClassrooms().filter(c => c.id !== item.id)].slice(0, 20)
      localStorage.setItem('mhc_my_classrooms', JSON.stringify(next))
      toast.success('课堂创建成功')
      navigate(`/teacher/${classroom.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (item: SavedClassroom) => {
    removeSavedClassroom(item.id)
    setSaved(listSavedClassrooms())
    toast.success('已从本机记录中移除')
  }

  /** 生成可在其他设备直接打开的管理链接（内含教师令牌） */
  const handleCopyLink = async (item: SavedClassroom) => {
    const token = getTeacherToken(item.id)
    if (!token) {
      toast.error('本机未保存该课堂的管理凭证，请用原电脑复制')
      return
    }
    const link = `${window.location.origin}/teacher/${item.id}#t=${token}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('管理链接已复制，在另一台设备打开即可继续管理')
    } catch {
      toast.error('复制失败，请手动复制：' + link)
    }
  }

  return (
    <div className="min-h-screen medical-grid-bg">
      <div className="medical-gradient text-white">
        <div className="mx-auto max-w-4xl px-5 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="mt-3 flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
            <GraduationCap className="h-7 w-7" />
            教师端
          </h1>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Card>
          <CardHeader>
            <CardTitle>创建新课堂</CardTitle>
            <CardDescription>
              输入课堂名称，系统会生成一个 6 位课堂码。学员输入课堂码或扫码即可加入。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="title">课堂名称</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：医学伦理学·第 5 讲 知情同意"
                  maxLength={60}
                />
              </div>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                创建课堂
              </Button>
            </form>
          </CardContent>
        </Card>

        {saved.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>我创建的课堂</CardTitle>
              <CardDescription>
                这些课堂记录保存在本机浏览器中，换设备或清理浏览器后需要重新进入（课堂数据本身仍在云端）。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {saved.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40"
                >
                  <Link to={`/teacher/${item.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      课堂码 <span className="font-mono font-semibold text-accent">{item.code}</span>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleCopyLink(item)}
                      title="复制管理链接，可在其他电脑打开"
                    >
                      <Link2 className="h-4 w-4 text-accent" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                      title="移除记录"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          提示：创建课堂后请把教师端页面地址加入浏览器收藏夹，避免课间误关页面后找不到课堂。
        </p>
      </main>
    </div>
  )
}
