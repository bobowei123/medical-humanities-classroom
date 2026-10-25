import express, { Application } from 'express'
import cors from 'cors'
import compression from 'compression'
import fs from 'fs'
import path from 'path'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { classroomRouter, questionRouter } from './modules/classroom'
// ============================================
// Add your domain module imports here
// ============================================
// Example: Product Module
// import { productRouter } from './modules/product.js'

export const createApp = (): Application => {
  const app = express()

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // 医学人文智慧课堂：课堂 / 题目 / 作答 / 统计
  app.use(`${env.API_PREFIX}/classrooms`, classroomRouter)
  app.use(`${env.API_PREFIX}/questions`, questionRouter)

  // 生产环境：直接托管前端构建产物，实现“单服务部署”
  if (env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), '../frontend/dist')
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath))
      // 前端路由 fallback（除 /api 之外的请求都返回 index.html）
      app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
      })
    }
  }

  // Error handling
  app.use(errorHandler)

  return app
}
