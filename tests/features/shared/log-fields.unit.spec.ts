import { test, expect } from '@playwright/test'
import { ownerLogFields, taskLogFields } from '../../../shared/log-fields.ts'

test.describe('log fields', () => {
  test('ownerLogFields describes an organization department', () => {
    expect(ownerLogFields({ type: 'organization', id: 'o1', name: 'Org 1', department: 'dep1' }))
      .toEqual({ ownerKey: 'organization.o1', ownerDep: 'dep1', ownerName: 'Org 1' })
  })

  test('ownerLogFields always returns the 3 keys', () => {
    const fields = ownerLogFields({ type: 'user', id: 'u1', department: '' })
    expect(Object.keys(fields).sort()).toEqual(['ownerDep', 'ownerKey', 'ownerName'])
    expect(fields).toEqual({ ownerKey: 'user.u1', ownerDep: undefined, ownerName: undefined })
  })

  test('taskLogFields names the id after the task type', () => {
    const task = { _id: 't1', catalog: { id: 'c1' }, owner: { type: 'user', id: 'u1', name: 'U' } }
    expect(taskLogFields(task, 'import')).toEqual({ catalogId: 'c1', taskType: 'import', importId: 't1', ownerKey: 'user.u1', ownerDep: undefined, ownerName: 'U' })
    expect(taskLogFields(task, 'publication')).toMatchObject({ taskType: 'publication', publicationId: 't1' })
    expect(taskLogFields(task, 'publication')).not.toHaveProperty('importId')
  })
})
