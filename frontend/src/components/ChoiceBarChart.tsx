import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChoiceStat } from '@/lib/api'

// 深蓝 → 青绿 的序列，保证投影仪下清晰可辨
const COLORS = ['#0e3a5c', '#17a398', '#2d6a8f', '#4fb3a5', '#1b7f9e', '#6cc3b6']

interface Props {
  options: ChoiceStat[]
}

export default function ChoiceBarChart({ options }: Props) {
  const data = useMemo(
    () =>
      options.map(o => ({
        name: `${o.label}`,
        full: `${o.label}. ${o.content}`,
        count: o.count,
        percent: o.percent,
      })),
    [options]
  )

  if (data.length === 0) return null

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, bottom: 8, left: 8 }}>
          <CartesianGrid horizontal={false} stroke="#e6ebef" />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#5b6b7c', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={44}
            tick={{ fill: '#12263a', fontSize: 14, fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(23,163,152,0.08)' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #dfe4e8',
              fontSize: 13,
              boxShadow: '0 8px 24px rgba(14,58,92,0.12)',
            }}
            formatter={(value: number, _name, item) => [
              `${value} 人（${(item?.payload as { percent?: number })?.percent ?? 0}%）`,
              '选择人数',
            ]}
            labelFormatter={(_label, payload) =>
              (payload?.[0]?.payload as { full?: string })?.full ?? ''
            }
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={38}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
            <LabelList
              dataKey="percent"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={{ fill: '#0e3a5c', fontSize: 13, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 space-y-1.5">
        {options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="font-medium text-foreground">{o.label}.</span>
            <span className="flex-1 truncate text-muted-foreground">{o.content}</span>
            <span className="shrink-0 font-semibold text-foreground">
              {o.count} 人 · {o.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
