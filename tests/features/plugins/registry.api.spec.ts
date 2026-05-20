import { test, expect } from '@playwright/test'
import { axiosAuth } from '../../support/axios.ts'

test.describe('plugins registry', () => {
  test('should search for plugins on npmjs as superadmin', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const res = await superadmin.get('/api/plugins-registry', { params: { q: 'mock' } })
    const plugin = res.data.results.filter((p: { name: string }) => p.name === '@data-fair/catalog-mock')
    expect(plugin.length).toBe(1)
    expect(res.data.results[0].name).toBe('@data-fair/catalog-mock')
  })

  test('should reject plugins registry search for a non-superadmin', async () => {
    const user = await axiosAuth('test_user1@test.com')
    await expect(user.get('/api/plugins-registry', { params: { q: 'mock' } }))
      .rejects.toMatchObject({ status: 403 })
  })
})
