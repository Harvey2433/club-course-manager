import {
  DEFAULT_ACCOUNT_BIO,
  MAX_ACCOUNT_BIO_LENGTH,
  MAX_ENTERPRISE_EMAIL_LENGTH
} from './constants'
import type { AccountRole } from '../../api/backend'

const USERNAME_PATTERN = /^[\p{L}\p{N}_@.\-]{2,20}$/u
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function stripControlCharacters(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
}

export function sanitizeUsername(value: string) {
  return stripControlCharacters(String(value || ''))
    .replace(/\s+/g, '')
    .trim()
}

export function sanitizeDisplayName(value: string) {
  return stripControlCharacters(String(value || ''))
    .trim()
    .replace(/\s{2}/g, ' ')
}

export function sanitizeBio(value: string) {
  const normalized = stripControlCharacters(String(value || ''))
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .replace(/[ \t]{2}/g, ' ')

  return normalized || DEFAULT_ACCOUNT_BIO
}

export function sanitizeEnterpriseEmail(value: string) {
  return stripControlCharacters(String(value || '')).trim().toLowerCase()
}

export function validateUsername(value: string) {
  if (!value) {
    return '请输入用户名'
  }

  if (value.length < 2 || value.length > 20) {
    return '用户名长度需为2到20位'
  }

  if (!USERNAME_PATTERN.test(value)) {
    return '用户名仅支持中文、字母、数字以及 _ - . @'
  }

  return ''
}

export function validateDisplayName(value: string) {
  if (!value) {
    return '请输入显示名称'
  }

  if (value.length < 2 || value.length > 24) {
    return '显示名称长度需为2到24位'
  }

  return ''
}

export function validateBio(value: string) {
  if (!value) {
    return ''
  }

  if (value.length > MAX_ACCOUNT_BIO_LENGTH) {
    return `个人简介不能超过 ${MAX_ACCOUNT_BIO_LENGTH} 个字符`
  }

  return ''
}

export function validatePassword(value: string) {
  if (!value) {
    return '请输入密码'
  }

  if (value.length < 8 || value.length > 32) {
    return '密码长度需为8到32位'
  }

  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return '密码至少需要包含一个字母和一个数字'
  }

  return ''
}

export function validateEnterpriseEmail(value: string, role: AccountRole) {
  if (role !== 'teacher') {
    if (!value) {
      return ''
    }

    if (value.length > MAX_ENTERPRISE_EMAIL_LENGTH) {
      return `邮箱长度不能超过 ${MAX_ENTERPRISE_EMAIL_LENGTH} 个字符`
    }

    return EMAIL_PATTERN.test(value) ? '' : '请输入有效的邮箱地址'
  }

  if (!value) {
    return '教师权限需要填写企业邮箱'
  }

  if (value.length > MAX_ENTERPRISE_EMAIL_LENGTH) {
    return `邮箱长度不能超过 ${MAX_ENTERPRISE_EMAIL_LENGTH} 个字符`
  }

  if (!EMAIL_PATTERN.test(value)) {
    return '请输入有效的企业邮箱'
  }

  return ''
}