import { describe, it, expect } from 'vitest'
import { isStrongPassword, formatBytes } from './utils'

describe('isStrongPassword', () => {
  it('приймає ≥6 символів з великою літерою і цифрою', () => {
    expect(isStrongPassword('Abc123')).toBe(true)
    expect(isStrongPassword('Пароль1')).toBe(true) // кирилична велика
  })

  it('відхиляє короткі / без цифри / без великої літери', () => {
    expect(isStrongPassword('Ab1')).toBe(false) // короткий
    expect(isStrongPassword('abcdef1')).toBe(false) // нема великої
    expect(isStrongPassword('Abcdefg')).toBe(false) // нема цифри
    expect(isStrongPassword('')).toBe(false)
  })
})

describe('formatBytes', () => {
  it('форматує людяно', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
})
