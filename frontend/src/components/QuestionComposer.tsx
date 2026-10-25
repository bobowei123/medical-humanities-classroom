import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Textarea } from '@/components/ui/input'
import { api, QUESTION_TYPE_LABEL, type QuestionDTO, type QuestionType } from '@/lib/api'

const TYPE_OPTIONS: { value: QuestionType; hint: string }[] = [
  { value: 'SINGLE', hint: '只能选一个' },
  { value: 'MULTI', hint: '可选多个' },
  { value: 'TEXT', hint: '自由输入文字' },
  { value: 'KEYWORD', hint: '生成中文词云' },
]

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

interface Props {
  classroomId: string
  onCreated: (question: QuestionDTO) => void
}

export default function QuestionComposer({ classroomId, onCreated }: Props) {
  const [type, setType] = useState<QuestionType>('SINGLE')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState([
    { label: 'A', content: '' },
    { label: 'B', content: '' },
  ])
  const [saving, setSaving] = useState(false)

  const needOptions = type === 'SINGLE' || type === 'MULTI'

  const updateOption = (index: number, content: string) => {
    setOptions(prev => prev.map((o, i) => (i === index ? { ...o, content } : o)))
  }

  const addOption = () => {
    if (options.length >= 8) return
    setOptions(prev => [...prev, { label: LABELS[prev.length], content: '' }])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, i) => i !== index).map((o, i) => ({ ...o, label: LABELS[i] })))
  }

  const reset = () => {
    setTitle('')
    setOptions([
      { label: 'A', content: '' },
      { label: 'B', content: '' },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = title.trim()
    if (!text) {
      toast.error('请先填写题干')
      return
    }
    if (needOptions) {
      const filled = options.filter(o => o.content.trim().length > 0)
      if (filled.length < 2) {
        toast.error('选择题至少需要填写 2 个选项')
        return
      }
    }
    setSaving(true)
    try {
      const created = await api.createQuestion(classroomId, {
        type,
        title: text,
        options: needOptions
          ? options
              .filter(o => o.content.trim().length > 0)
              .map((o, i) => ({ label: LABELS[i], content: o.content.trim() }))
          : [],
      })
      toast.success(`${QUESTION_TYPE_LABEL[type]}已发布`)
      reset()
      onCreated(created)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>发布新题目</CardTitle>
        <CardDescription>
          题目发布后处于“未开始”状态，点击「开始答题」后学员才能作答。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 题型选择 */}
          <div className="space-y-2">
            <Label>题型</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={[
                    'rounded-lg border px-3 py-2.5 text-left transition-all',
                    type === opt.value
                      ? 'border-accent bg-secondary ring-1 ring-accent'
                      : 'border-border bg-card hover:bg-secondary/50',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'text-sm font-semibold',
                      type === opt.value ? 'text-accent' : 'text-foreground',
                    ].join(' ')}
                  >
                    {QUESTION_TYPE_LABEL[opt.value]}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 题干 */}
          <div className="space-y-2">
            <Label htmlFor="q-title">题干</Label>
            <Textarea
              id="q-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：在您看来，告知坏消息时最需要优先考虑的是什么？"
              maxLength={500}
            />
          </div>

          {/* 选项（仅选择题显示） */}
          {needOptions && (
            <div className="space-y-2">
              <Label>选项</Label>
              <div className="space-y-2">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-sm font-semibold text-primary">
                      {opt.label}
                    </span>
                    <Input
                      value={opt.content}
                      onChange={e => updateOption(index, e.target.value)}
                      placeholder={`选项 ${opt.label} 的内容`}
                      maxLength={200}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                      title="删除选项"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
              {options.length < 8 && (
                <Button variant="soft" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                  添加选项
                </Button>
              )}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            发布题目
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
