import { randomInt } from 'crypto'

// 去掉了容易混淆的字符：0/O、1/I/L
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** 生成学员使用的课堂码（默认 6 位，大写，便于口头/板书传播） */
export function generateClassCode(length = 6): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }
  return result
}

/** 生成教师管理令牌（较长，不会对外展示给学员） */
export function generateTeacherToken(length = 28): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]
  }
  return result
}

/** 生成学员在本机的匿名标识 */
export function generateParticipantId(): string {
  const raw = globalThis.crypto?.randomUUID?.()
  if (raw) return `p_${raw.replace(/-/g, '').slice(0, 20)}`
  return `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}
