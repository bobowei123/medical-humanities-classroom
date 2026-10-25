import { Link } from 'react-router-dom'
import {
  BarChart3,
  Cloud,
  GraduationCap,
  MessageSquareQuote,
  QrCode,
  Smartphone,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: QrCode,
    title: '扫码即答',
    desc: '学员用手机浏览器或微信扫码进入，无需下载 APP，也无需注册账号。',
  },
  {
    icon: BarChart3,
    title: '实时统计',
    desc: '选择题即时显示各选项人数与百分比，柱状图直观呈现课堂观点分布。',
  },
  {
    icon: MessageSquareQuote,
    title: '原文呈现',
    desc: '简答题完整保留学员提交的原始文字，便于教师逐条点评与讨论。',
  },
  {
    icon: Cloud,
    title: '中文词云',
    desc: '关键词题自动汇总高频词汇并生成中文词云，一眼看清课堂焦点。',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen medical-grid-bg">
      {/* 顶部头图 */}
      <header className="medical-gradient text-white">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/75">
              Medical Humanities
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight md:text-5xl">
            医学人文智慧课堂
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-lg">
            面向高校医学人文课程与医务人员培训的课堂互动平台。教师一键发布题目，学员扫码即可作答，
            答题结果实时可视化，让每一次课堂讨论都有据可依。
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/teacher" className="w-full sm:w-auto">
              <Button
                size="xl"
                className="w-full bg-white text-[#0e3a5c] hover:bg-white/90 sm:w-auto"
              >
                <GraduationCap className="h-5 w-5" />
                我是教师 · 创建课堂
              </Button>
            </Link>
            <Link to="/student" className="w-full sm:w-auto">
              <Button
                size="xl"
                className="w-full border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 sm:w-auto"
              >
                <Smartphone className="h-5 w-5" />
                我是学员 · 扫码答题
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 功能特性 */}
      <main className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">
          四大核心能力
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          适配电脑投影与手机屏幕，数据全程保存在云端数据库
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 medical-card-shadow transition-transform hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* 题型说明 */}
        <div className="mt-14 rounded-xl border border-border bg-card p-6 md:p-8">
          <h2 className="text-lg font-semibold tracking-tight">支持四种课堂题型</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ['单选题', '单选投票，适合伦理两难情境的快速取向调查'],
              ['多选题', '多选汇总，适合“哪些因素最重要”类问题'],
              ['简答题', '开放作答，保留学员原始文字'],
              ['关键词题', '关键词采集，自动生成中文词云'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-lg border border-border bg-secondary/40 p-4">
                <div className="text-sm font-semibold text-primary">{t}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        医学人文智慧课堂 · 数据保存在云端 PostgreSQL 数据库
      </footer>
    </div>
  )
}
