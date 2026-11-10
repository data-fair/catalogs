/**
 * The agent-facing surface of the API: what `@data-fair/openapi-mcp` generates from the x-agent
 * annotations of the document. `lint: 'error'` refuses a description that contradicts its schema;
 * the golden turns any change to a tool's name, description or schema into a diff a reviewer sees.
 * Regenerate with UPDATE_GOLDEN=1 when the change is intended.
 */
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { load, toolSetSnapshot, toolsForScopes } from '@data-fair/openapi-mcp'
import apiDocs from '../../../api/contract/api-docs.ts'
import { readAgentSkill } from '../../../api/contract/skills.ts'

const goldenPath = path.resolve(import.meta.dirname, '../../fixtures/agent-surface.json')
const baseUrl = 'http://localhost/catalogs/api'

/** Serves what the API serves at /catalogs/api/agents/skills/<name>.md */
const skillFetch = (async (input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input)
  const prefix = `${baseUrl}/agents/skills/`
  const body = url.startsWith(prefix) && url.endsWith('.md') ? readAgentSkill(url.slice(prefix.length, -3)) : undefined
  return body ? new Response(body, { headers: { 'content-type': 'text/markdown' } }) : new Response('not found', { status: 404 })
}) as typeof fetch

const editorActions = ['describeState', 'getData', 'setFieldValue', 'setData', 'getFieldSuggestions', 'editArray', 'saveForm', 'reloadForm']
const catalogEditor = editorActions.map(t => `catalog_configuration_${t}`)
const importEditor = editorActions.map(t => `import_configuration_${t}`)
const tools = [
  'list_catalogs', 'describe_catalog', 'create_catalog', 'describe_catalog_plugin', 'change_catalog_owner', 'delete_catalog', 'browse_remote_resources',
  'list_imports', 'describe_import', 'create_import', 'rerun_import', 'change_import_owner', 'delete_import',
  'list_publications', 'describe_publication', 'create_publication', 'rerun_publication', 'delete_publication'
]

test.describe('agent surface of the api docs', () => {
  test('tools load without a lint error and match the golden', async () => {
    const toolSet = await load(apiDocs('en'), { fetch: skillFetch, baseUrl, lint: 'error' })
    expect(toolSet.tools.map(t => t.name).sort()).toEqual([...tools, ...catalogEditor, ...importEditor].sort())
    expect(toolSet.skills.map(s => s.name)).toEqual(['workflow', 'catalog-configuration', 'import-configuration'])
    const workflow = toolSet.skills.find(s => s.name === 'workflow')
    expect(workflow?.error).toBeUndefined()
    expect(workflow?.body).toMatch(/^# Connecting catalogs, importing and publishing/)
    expect(workflow!.description.length).toBeLessThanOrEqual(1024)
    // through JSON: the golden is a file, and an `enum: undefined` left by the generator is not
    const snapshot = JSON.parse(JSON.stringify(toolSetSnapshot(toolSet)))
    expect(JSON.stringify(snapshot)).not.toContain('"secrets"')
    if (process.env.UPDATE_GOLDEN) writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2) + '\n')
    expect(snapshot).toEqual(JSON.parse(readFileSync(goldenPath, 'utf8')))
  })

  test('scoped tokens are offered the tools of their tier', async () => {
    const toolSet = await load(apiDocs('en'), { fetch: skillFetch, baseUrl, lint: 'error' })
    const names = (scopes?: string[]) => toolsForScopes(toolSet, scopes).tools.map(t => t.name).sort()
    expect(names(['catalogs:read'])).toEqual(['browse_remote_resources', 'describe_catalog', 'describe_catalog_plugin', 'describe_import', 'describe_publication', 'list_catalogs', 'list_imports', 'list_publications'])
    const write = names(['catalogs:write'])
    for (const t of ['create_import', 'create_publication', 'rerun_import', ...importEditor]) expect(write).toContain(t)
    for (const t of ['create_catalog', 'catalog_configuration_saveForm', 'delete_catalog', 'change_import_owner']) expect(write).not.toContain(t)
    expect(names(['catalogs:admin'])).toEqual(expect.arrayContaining(['create_import', 'create_publication', 'rerun_import', ...importEditor, 'create_catalog', 'catalog_configuration_saveForm', 'delete_catalog', 'change_import_owner']))
    expect(names(['datasets:read'])).toEqual([])
  })
})
