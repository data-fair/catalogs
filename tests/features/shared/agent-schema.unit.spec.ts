import { test, expect } from '@playwright/test'
import { agentSchema } from '../../../api/src/misc/utils/agent-schema.ts'

const fixture = () => ({
  type: 'object',
  properties: {
    dataset: {
      type: 'object',
      // eslint-disable-next-line no-template-curly-in-string
      layout: { getItems: { url: '${context.origin}/data-fair/api/v1/datasets?owner=${context.ownerFilter}' } }
    },
    ownerId: { type: 'string', default: '{context.owner.id}' },
    resource: { type: 'string', description: 'resource {context.resourceId} of {context.catalogConfig.url}' },
    timeZone: { type: 'string', layout: { comp: 'autocomplete', getItems: 'context.utcs' } }
  }
})

const context = {
  owner: { type: 'organization' as const, id: 'test_org1', name: 'Test Org 1', department: 'dep1' },
  catalogConfig: { url: 'https://example.com', nested: { a: 1 } },
  resourceId: 'r1'
}

test.describe('agent schema', () => {
  test('the origin is emptied and the owner filter resolved', () => {
    const schema = agentSchema(fixture(), context)
    expect(schema.properties.dataset.layout.getItems.url).toBe('/data-fair/api/v1/datasets?owner=organization:test_org1:dep1')
  })

  test('the owner, the resource and the scalar catalog config values are substituted', () => {
    const schema = agentSchema(fixture(), context)
    expect(schema.properties.ownerId.default).toBe('test_org1')
    expect(schema.properties.resource.description).toBe('resource r1 of https://example.com')
  })

  test('the utcs items become a static list', () => {
    const schema = agentSchema(fixture(), context)
    expect(schema.properties.timeZone.layout.getItems).toBeUndefined()
    expect(schema.properties.timeZone.layout.items).toContain('Europe/Paris')
  })

  test('the input is not mutated', () => {
    const input = fixture()
    agentSchema(input, context)
    expect(input).toEqual(fixture())
  })
})
