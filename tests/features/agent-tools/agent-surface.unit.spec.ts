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

// the editor operations are the forms of one group of form_* tools (openapi-mcp 0.14), the form chosen by argument
const formTools = ['describeState', 'getData', 'setFieldValue', 'setData', 'getFieldSuggestions', 'editArray', 'saveForm', 'reloadForm'].map(t => `form_${t}`)
const tools = [
  'list_catalogs', 'describe_catalog', 'create_catalog', 'describe_catalog_plugin', 'change_catalog_owner', 'delete_catalog', 'browse_remote_resources',
  'list_imports', 'describe_import', 'create_import', 'rerun_import', 'delete_import',
  'list_publications', 'describe_publication', 'create_publication', 'rerun_publication', 'delete_publication'
]

test.describe('agent surface of the api docs', () => {
  test('tools load without a lint error and match the golden', async () => {
    const toolSet = await load(apiDocs('en'), { fetch: skillFetch, baseUrl, lint: 'error' })
    expect(toolSet.tools.map(t => t.name).sort()).toEqual([...tools, ...formTools].sort())
    expect(toolSet.skills.map(s => s.name)).toEqual(['workflow', 'form'])
    // the workflow skill does not list the form tools: they would offer it to a token granted another service's form
    expect(toolSet.skills.find(s => s.name === 'workflow')?.tools.some(t => t.startsWith('form_'))).toBe(false)
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
    const scoped = (scopes?: string[]) => toolsForScopes(toolSet, scopes).tools
    const names = (scopes?: string[]) => scoped(scopes).map(t => t.name).sort()
    // the forms a token is offered, from the enum of the form argument of form_saveForm
    const forms = (scopes?: string[]) => (scoped(scopes).find(t => t.name === 'form_saveForm')?.inputSchema.properties?.form as { enum?: string[] } | undefined)?.enum
    expect(names(['catalogs:read'])).toEqual(['browse_remote_resources', 'describe_catalog', 'describe_catalog_plugin', 'describe_import', 'describe_publication', 'list_catalogs', 'list_imports', 'list_publications'])
    const write = names(['catalogs:write'])
    for (const t of ['create_import', 'create_publication', 'rerun_import', ...formTools]) expect(write).toContain(t)
    for (const t of ['create_catalog', 'change_catalog_owner', 'delete_catalog', 'delete_import']) expect(write).not.toContain(t)
    expect(forms(['catalogs:write'])).toEqual(['import_configuration'])
    expect(names(['catalogs:admin'])).toEqual(expect.arrayContaining(['create_import', 'create_publication', 'rerun_import', ...formTools, 'create_catalog', 'change_catalog_owner', 'delete_catalog', 'delete_import']))
    expect(forms(['catalogs:admin'])?.sort()).toEqual(['catalog_configuration', 'import_configuration'])
    expect(names(['datasets:read'])).toEqual([])
  })

  test('writes naming a catalog by id carry its checked title', async () => {
    const toolSet = await load(apiDocs('en'), { fetch: skillFetch, baseUrl, lint: 'error' })
    for (const name of ['change_catalog_owner', 'delete_catalog']) {
      const tool = toolSet.tools.find(t => t.name === name)
      expect(tool?.inputSchema.properties).toHaveProperty('catalogTitle')
    }
  })

  test('the document resolves the schema translations to its locale', () => {
    for (const locale of ['en', 'fr'] as const) expect(JSON.stringify(apiDocs(locale))).not.toContain('x-i18n-')
    expect(JSON.stringify(apiDocs('fr').components.schemas.import)).toContain('Planification de l\'import')
  })
})
