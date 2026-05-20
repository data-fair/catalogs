import { test, expect } from '@playwright/test'
import { cipher, decipher, decipherSecrets } from '../../../shared/cipher.ts'

test.describe('cipher / decipher', () => {
  test('round-trips a string through cipher and decipher', () => {
    const encrypted = cipher('hello world', 'a-password')
    expect(typeof encrypted).not.toBe('string')
    expect(encrypted).toMatchObject({ alg: 'aes256' })
    expect(decipher(encrypted, 'a-password')).toBe('hello world')
  })

  test('cipher returns an already-ciphered content unchanged', () => {
    const encrypted = cipher('secret', 'pw')
    expect(cipher(encrypted, 'pw')).toBe(encrypted)
  })

  test('decipher returns a plain string unchanged', () => {
    expect(decipher('not-ciphered', 'pw')).toBe('not-ciphered')
  })

  test('decipher with the wrong password does not return the original content', () => {
    const encrypted = cipher('top-secret', 'right-password')
    let result: string | null
    try {
      result = decipher(encrypted, 'wrong-password')
    } catch {
      result = null
    }
    expect(result).not.toBe('top-secret')
  })
})

test.describe('decipherSecrets', () => {
  test('returns an empty object when secrets is undefined', () => {
    expect(decipherSecrets(undefined, 'pw')).toEqual({})
  })

  test('deciphers each entry and leaves plain strings untouched', () => {
    const secrets = {
      apiKey: cipher('the-api-key', 'pw'),
      plain: 'plain-value'
    }
    expect(decipherSecrets(secrets, 'pw')).toEqual({
      apiKey: 'the-api-key',
      plain: 'plain-value'
    })
  })
})
