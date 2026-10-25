import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import type { WordStat } from '@/lib/api'

interface Props {
  words: WordStat[]
}

// 青绿 → 深蓝 的冷暖过渡，适合中文词云的层次展示
const PALETTE = ['#0e3a5c', '#14567f', '#17a398', '#2d6a8f', '#4fb3a5', '#1b7f9e', '#c9a227']

export default function WordCloud({ words }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const data = useMemo(
    () =>
      words.map((w, i) => ({
        name: w.word,
        value: w.count,
        textStyle: { color: PALETTE[i % PALETTE.length] },
      })),
    [words]
  )

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current)
    chartRef.current = chart

    const render = () => {
      chart.setOption(
        {
          tooltip: {
            show: true,
            formatter: (p: { name: string; value: number }) => `${p.name}：${p.value} 人提及`,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderColor: '#dfe4e8',
            textStyle: { color: '#12263a', fontSize: 13 },
          },
          series: [
            {
              type: 'wordCloud',
              shape: 'circle',
              left: 'center',
              top: 'center',
              width: '96%',
              height: '92%',
              sizeRange: [16, 58],
              rotationRange: [0, 0], // 中文横排更易读
              gridSize: 12,
              drawOutOfBound: false,
              textStyle: {
                fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
                fontWeight: 600,
              },
              emphasis: { textStyle: { fontWeight: 700 } },
              data,
            },
          ],
        },
        true
      )
    }

    render()

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [data])

  return (
    <div className="w-full">
      <div ref={containerRef} className="h-[340px] w-full" />
      {data.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">还没有学员提交关键词</p>
      )}
    </div>
  )
}
