import { test, expect } from '../../fixtures/login.ts'
import { axios } from '../../support/axios.ts'

const anonymous = axios({ validateStatus: () => true })

test.describe('api document routes', () => {
  test('the document is public and cached, varying on the language', async () => {
    const res = await anonymous.get('/api/api-docs.json')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(res.headers.vary).toMatch(/Accept-Language/i)
    expect(res.data.openapi).toBe('3.1.0')
  })

  test('the document is in french by default and in english on request', async () => {
    const fr = (await anonymous.get('/api/api-docs.json')).data
    const en = (await anonymous.get('/api/api-docs.json', { headers: { 'Accept-Language': 'en' } })).data
    expect(fr.info.title).toBe('API Catalogues')
    expect(en.info.title).toBe('API Catalogs')
  })

  test('an unknown skill is not found', async () => {
    expect((await anonymous.get('/api/agents/skills/nope.md')).status).toBe(404)
  })
})
