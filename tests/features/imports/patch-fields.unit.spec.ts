import { test, expect } from '@playwright/test'
import { importPatchFields, patchableImportFields } from '../../../api/src/imports/patch-fields.ts'

test.describe('import patch fields', () => {
  test('the patchable fields are exactly the write and admin parts', () => {
    expect(patchableImportFields(false).sort()).toEqual([...importPatchFields.write, ...importPatchFields.admin].sort())
  })

  test('no field is in both tiers', () => {
    const admin: readonly string[] = importPatchFields.admin
    expect(importPatchFields.write.filter(f => admin.includes(f))).toEqual([])
  })
})
