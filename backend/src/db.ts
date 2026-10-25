import { PrismaClient } from '@prisma/client'

// 数据库连接单例（连接到云端 PostgreSQL）
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})
