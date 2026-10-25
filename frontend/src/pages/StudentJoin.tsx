import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, LogIn, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { api, getNickname, setNickname } from '@/lib/api'

export default function StudentJoin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(() => (searchParams.get('code') ?? '').toUpperCase())
  const [nickname, setNickInput] = useState(() => getNickname())
  const [loading, setLoading] = useState(false)

  const autoJoined = useRef(false)

  const doJoin = async (raw: string) => {
    const value = raw.trim().toUpperCase()
    if (value.length < 4) {
      toast.error('请输入 6 位课堂码')
      return
    }
    setLoading(true)
    try {
      setNickname(nickname.trim())
      const room = await api.joinClassroom(value)
      navigate(`/student/${room.id}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '进入课堂失败，请检查课堂码')
    } finally {
      setLoading(false)
    }
  }

  // 扫码进入时 URL 上带有课堂码，直接自动进入
  useEffect(() => {
    const urlCode = searchParams.get('code')
    if (urlCode && !autoJoined.current) {
      autoJoined.current = true
      void doJoin(urlCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen medical-grid-bg">
      <div className="medical-gradient text-white">
        <div className="mx-auto max-w-md px-5 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="mt-3 flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <Smartphone className="h-6 w-6" />
            学员端
          </h1>
        </div>
      </div>

      <main className="mx-auto max-w-md px-5 py-8">
        <Card>
          <CardHeader>
            <CardTitle>进入课堂</CardTitle>
            <CardDescription>
              输入教师投影屏幕上的 6 位课堂码即可答题，无需下载 APP，也无需注册。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={e => {
                e.preventDefault()
                void doJoin(code)
              }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="code">课堂码</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="例如：A3K9TQ"
                  maxLength={12}
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="h-14 text-center font-mono text-2xl font-bold tracking-[0.3em]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">昵称（选填）</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={e => setNickInput(e.target.value)}
                  placeholder="留空则匿名作答"
                  maxLength={20}
                />
              </div>

              <Button type="submit" size="xl" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
                进入课堂
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          建议使用手机浏览器或微信扫一扫进入。
          <br />
          您的作答结果将实时汇总到教师的投影屏幕上。
        </p>
      </main>
    </div>
  )
}
