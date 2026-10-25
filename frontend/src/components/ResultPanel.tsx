import { Download, FileText, Inbox, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ChoiceBarChart from './ChoiceBarChart'
import WordCloud from './WordCloud'
import type { StatsDTO } from '@/lib/api'

interface Props {
  stats: StatsDTO | null
  loading: boolean
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function exportCsv(stats: StatsDTO) {
  const rows: string[][] = []

  if (stats.type === 'SINGLE' || stats.type === 'MULTI') {
    rows.push(['选项', '内容', '人数', '占比(%)'])
    stats.options.forEach(o => rows.push([o.label, o.content, String(o.count), String(o.percent)]))
  } else if (stats.type === 'TEXT') {
    rows.push(['昵称', '回答内容', '提交时间'])
    stats.texts.forEach(t => rows.push([t.nickname || '匿名', t.content, formatTime(t.createdAt)]))
  } else {
    rows.push(['关键词', '提及人数'])
    stats.words.forEach(w => rows.push([w.word, String(w.count)]))
  }

  const csv = rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `课堂结果_${stats.questionId.slice(-6)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultPanel({ stats, loading }: Props) {
  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Inbox className="h-8 w-8 opacity-40" />
        <p className="text-sm">请在左侧选择一道题目查看结果</p>
      </div>
    )
  }

  const isChoice = stats.type === 'SINGLE' || stats.type === 'MULTI'

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* 提交人数概览 */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          {stats.status === 'OPEN' ? (
            <Badge variant="success">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              答题中
            </Badge>
          ) : (
            <Badge variant="secondary">已结束</Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          已提交{' '}
          <span className="text-xl font-bold text-primary">{stats.total}</span> 人
        </div>
      </div>

      {/* 选择题：柱状图 */}
      {isChoice && <ChoiceBarChart options={stats.options} />}

      {/* 简答题：原始文字墙 */}
      {stats.type === 'TEXT' &&
        (stats.texts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            还没有学员提交回答
          </p>
        ) : (
          <div className="thin-scroll max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {stats.texts.map(t => (
              <div
                key={t.id}
                className="rounded-lg border border-border bg-secondary/30 p-4"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {t.nickname || '匿名学员'}
                  </span>
                  <span>·</span>
                  <span>{formatTime(t.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {t.content}
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* 关键词题：中文词云 */}
      {stats.type === 'KEYWORD' && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Type className="h-3.5 w-3.5" />
            共 {stats.words.length} 个关键词，按提及人数排序
          </div>
          <WordCloud words={stats.words} />
          {stats.words.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.words.slice(0, 20).map(w => (
                <span
                  key={w.word}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {w.word} <span className="text-accent">×{w.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 导出 */}
      {stats.total > 0 && (
        <Button variant="outline" size="sm" onClick={() => exportCsv(stats)}>
          <Download className="h-4 w-4" />
          导出本题结果（CSV）
        </Button>
      )}
    </div>
  )
}
